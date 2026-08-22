import * as fs from 'fs';
import { FileRepository } from '../Models/File/FileRepository';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';
import { LineMatcher } from './LineMatcher';

export interface NumberedFileLine { filePath: string; lineText: string; lineNumber: number }

export class DirectoryWalker {

    protected fileRepository: FileRepository;

    constructor(fileRepository: FileRepository = new FileRepository()) {
        this.fileRepository = fileRepository;
    }

    /**
     * Recursively walk targetDir, invoking onFile with the numbered lines of every non-binary file found.
     */
    public async walk(
        targetDir: string,
        excludedFullPaths: string[],
        onFile: (lines: NumberedFileLine[]) => Promise<void>
    ) {
        await this.walkDirectory(targetDir, excludedFullPaths, onFile, new Set<string>());
    }

    /**
     * Directories are visited at most once, keyed by the real path behind them.
     *
     * isDirectory is answered by fs.statSync, which resolves symlinks, so a link pointing at one of
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
        onFile: (lines: NumberedFileLine[]) => Promise<void>,
        visitedDirectories: Set<string>
    ) {
        const resolvedDir = this.resolvePath(targetDir);
        if (visitedDirectories.has(resolvedDir)) {
            return;
        }
        visitedDirectories.add(resolvedDir);

        const seekedFilesOrDirectories = this.fileRepository.retrieve(targetDir, excludedFullPaths);

        // if file path is directory, re-walk by using file path as the next target directory
        const directories = seekedFilesOrDirectories.filter(target => target.isDirectory);
        for (const target of directories) {
            await this.walkDirectory(target.FullPath, excludedFullPaths, onFile, visitedDirectories);
        }

        // if file path is file, read file and pass its lines to onFile
        const files = seekedFilesOrDirectories.filter(f => f.isFile).filter(f => !f.seemsBinary);
        for (const f of files) {
            await onFile(this.readContent(f));
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
    protected resolvePath(targetDir: string): string {
        try {
            return fs.realpathSync(targetDir);
        } catch {
            return targetDir;
        }
    }

    protected readContent(file: SeekedFileModel): NumberedFileLine[] {
        return LineMatcher.splitIntoNumberedLines(file.Content)
                           .map(v => ({ filePath: file.FullPath, ...v }));
    }

}
