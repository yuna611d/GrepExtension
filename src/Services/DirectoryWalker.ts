import * as fs from 'fs';
import { forEachWithLimit } from '../Commons/Concurrency';
import { FileRepository } from '../Models/File/FileRepository';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';
import { LineMatcher } from './LineMatcher';

export interface NumberedFileLine { filePath: string; lineText: string; lineNumber: number }

export class DirectoryWalker {

    /**
     * How many filesystem questions may be outstanding at once. Enough to keep Node's thread pool
     * busy while a search runs, small enough that a directory of any size cannot exhaust handles.
     */
    protected static readonly CONCURRENCY = 32;

    /**
     * How many files' contents may be held at once while reading ahead of what is being reported.
     * Smaller than CONCURRENCY because each of these is a whole file rather than an answer about
     * one, and a workspace is free to contain very large text files.
     */
    protected static readonly CONTENT_PREFETCH = 8;

    protected fileRepository: FileRepository;

    constructor(fileRepository: FileRepository = new FileRepository()) {
        this.fileRepository = fileRepository;
    }

    /**
     * Recursively walk every targetDir, invoking onFile with the numbered lines of every
     * non-binary file found.
     *
     * A workspace is made of however many folders were opened together, so what gets walked is a
     * list rather than a single directory. They are walked in the order given - the order the
     * results appear in - and share one record of where the walk has already been, because
     * nothing stops a workspace from holding a folder and one of its own subfolders as two
     * separate roots. Without that, every file under the inner one would be reported twice.
     */
    public async walk(
        targetDirs: string[],
        excludedFullPaths: string[],
        onFile: (readings: NumberedFileLine[][]) => Promise<void>
    ) {
        const visitedDirectories = new Set<string>();
        for (const targetDir of targetDirs) {
            await this.walkDirectory(targetDir, excludedFullPaths, onFile, visitedDirectories);
        }
    }

    /**
     * Directories are visited at most once, keyed by the real path behind them.
     *
     * isDirectory is answered by fs.stat, which resolves symlinks, so a link pointing at one of
     * its own ancestors used to be descended into over and over: dir/link/link/link/... until the
     * operating system refused with ELOOP. That error aborted the whole grep, and because every
     * directory is recursed into before its sibling files are read, it escaped before a single file
     * had been grepped - one such link anywhere in the workspace left the user with an error and an
     * empty result file.
     *
     * Recording resolved paths also stops two links to the same tree from reporting every match in
     * it twice.
     */
    protected async walkDirectory(
        targetDir: string,
        excludedFullPaths: string[],
        onFile: (readings: NumberedFileLine[][]) => Promise<void>,
        visitedDirectories: Set<string>
    ) {
        const resolvedDir = await this.resolvePath(targetDir);
        if (visitedDirectories.has(resolvedDir)) {
            return;
        }
        visitedDirectories.add(resolvedDir);

        const seekedFilesOrDirectories = await this.fileRepository.retrieve(targetDir, excludedFullPaths);

        // Ask what every entry is, several at a time. The models cache the answer, so the ordered
        // loops below read it back without going near the filesystem again.
        await forEachWithLimit(seekedFilesOrDirectories, DirectoryWalker.CONCURRENCY, e => e.isDirectory());

        // What each entry is, in the order the directory was read - both loops below walk this
        // list, and the order they walk it in is the order matches are reported.
        const entries = [];
        for (const entry of seekedFilesOrDirectories) {
            entries.push({ entry, isDirectory: await entry.isDirectory(), isFile: await entry.isFile() });
        }

        // if file path is directory, re-walk by using file path as the next target directory
        for (const { entry, isDirectory } of entries) {
            if (isDirectory) {
                await this.walkDirectory(entry.FullPath, excludedFullPaths, onFile, visitedDirectories);
            }
        }

        // Sniff the files for binary content several at a time, for the same reason.
        const files = entries.filter(e => e.isFile).map(e => e.entry);
        await forEachWithLimit(files, DirectoryWalker.CONCURRENCY, f => f.seemsBinary());

        const textFiles = [];
        for (const file of files) {
            // Already answered above, so this reads the cached verdict rather than the file.
            if (!await file.seemsBinary()) {
                textFiles.push(file);
            }
        }

        // Read a few files ahead of what is being reported, then report them in the directory's
        // own order: onFile writes the matches out, so that order is the order they appear in.
        // Only the files about to be reported are read, and only a few at a time - reading them
        // all would hold the whole workspace in memory, and reading the binaries among them is
        // what the sniff above exists to avoid.
        for (let i = 0; i < textFiles.length; i += DirectoryWalker.CONTENT_PREFETCH) {
            const batch = textFiles.slice(i, i + DirectoryWalker.CONTENT_PREFETCH);
            await forEachWithLimit(batch, DirectoryWalker.CONTENT_PREFETCH, f => f.getContentCandidates());

            for (const file of batch) {
                await onFile(await this.readContent(file));
                // Reported, so nothing needs its contents any more. Every model in this directory
                // stays alive until the walk of it finishes, so a file that keeps what it read
                // keeps it for the rest of the directory - which is what made the peak follow the
                // directory's total size instead of the prefetch window above.
                file.releaseContent();
            }
        }
    }

    /**
     * The real path behind targetDir, so that two routes to one directory compare equal.
     *
     * A path that cannot be resolved - a broken link, or one this process may not stat - is used as
     * written rather than reported: it is still worth recording so a cycle through it terminates,
     * and letting this throw would abort the grep for exactly the kind of entry the walk should
     * simply carry on past.
     */
    protected async resolvePath(targetDir: string): Promise<string> {
        try {
            return await fs.promises.realpath(targetDir);
        } catch {
            return targetDir;
        }
    }

    /**
     * The file's lines, once per reading of it worth searching - normally one, but several when
     * the search has been asked to try every encoding. Whoever is searching picks between them,
     * since only they know what is being looked for.
     */
    protected async readContent(file: SeekedFileModel): Promise<NumberedFileLine[][]> {
        const readings = await file.getContentCandidates();
        return readings.map(text => LineMatcher.splitIntoNumberedLines(text)
                                               .map(v => ({ filePath: file.FullPath, ...v })));
    }

}
