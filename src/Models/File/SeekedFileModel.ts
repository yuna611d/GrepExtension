import * as fs from 'fs';
import { Common } from '../../Commons/Common';
import { Lazy } from '../../Commons/Lazy';
import { BaseDao } from '../../DAO/BaseDao';
import { FileModel } from './FileModel';

export class SeekedFileModel extends FileModel {

    public readonly TargetDir: string;
    protected excludedFullPaths: string[];
    protected encoding: BufferEncoding = 'utf8';

    constructor(dao: BaseDao, fileNameWithExtension: string, targetDir: string, excludedFullPaths: string[]) {
        super(dao);
        this.FileNameWithExtension = fileNameWithExtension;
        this.TargetDir = targetDir;
        this.excludedFullPaths = excludedFullPaths;
    }

    //--- Override Functions ---
    public get FileName() {
        return this._fileNameAndExtension.get()[0];
    }

    public get FileExtension() {
        return this._fileNameAndExtension.get()[1];
    }
    protected _fileNameAndExtension = new Lazy(() => this.getFileNameAndExtension());

    public readonly FileNameWithExtension: string;

    public get FullPath() {
        return this.TargetDir + Common.DIR_SEPARATOR + this.FileNameWithExtension;
    }
    //--- Override Functions ---

    protected getFileNameAndExtension() {
        const fileInfos = this.FileNameWithExtension.split('.');
        // file.txt => file, txt / dir => dir
        if (fileInfos.length < 2) {
            // return directory name and empty string as extension
            const dirName = fileInfos[0];
            return [dirName, ""];
        }

        // FileNameWithExtension comes from fs.readdirSync, which yields a single entry name -
        // never a path - so there is no directory prefix here to strip off.
        const fileExtension = fileInfos[fileInfos.length -1];
        const fileName = fileInfos[fileInfos.length -2];
        // return filename and extension
        return [fileName, fileExtension];
    }

    public get Content(): string {
        return this._content.get();
    }
    protected _content = new Lazy(() => this.BufferContent.toString(this.encoding));

    protected get BufferContent(): Buffer {
        return this._bufferContent.get();
    }
    protected _bufferContent = new Lazy(() => fs.readFileSync(this.FullPath, null));

    public isExcludedFile(): boolean {
        // don't read files which have extension specified. Matched as a whole extension rather
        // than as a pattern: the setting is documented as a list of extensions, so excluding "js"
        // must not also drop every .json file, and an extension that happens to contain regexp
        // syntax ("c++") must be matched literally instead of failing to compile.
        if (this.ExcludedFileExtensions.includes(this.FileExtension.toLowerCase())) {
            return true;
        }
        // don't read result file. Compared by full path (not just basename) so a same-named
        // fixture nested in a subdirectory isn't mistaken for the actual output file.
        return this.excludedFullPaths.includes(this.FullPath);
    }
    
    public isIgnoredFileOrDirectory(): boolean {
        // skip if file extension is out of target
        if (this.isExcludedFile()) {
            return true;
        }
        // skip if hidden file or directory.
        if (this.ignoreHiddenFile() && this.FileNameWithExtension.startsWith(".")) {
            return true;
        }
        return false;
    }


    public get isFile(): boolean {
        // Check if the file path is file or directory
        return this.stat?.isFile() ?? false;
    }

    public get isDirectory(): boolean {
        return this.stat?.isDirectory() ?? false;
    }

    /**
     * What this entry actually is, or null when the filesystem will not say.
     *
     * Stat'd once per model. The walk asks every entry isDirectory and then asks it isFile, so an
     * un-cached getter meant two identical statSync calls for every entry in the workspace - and
     * statSync is synchronous, so each one blocks the extension host.
     *
     * statSync follows symlinks, so it throws ENOENT on a link whose target is gone - and that
     * error used to escape all the way out of the directory walk, which reports it as "Grep failed
     * due to an unexpected error". Because directories are recursed into before their sibling files
     * are read, one dangling link left the user with that error and an empty result file, no matter
     * how many perfectly readable files sat next to it.
     *
     * The same applies to an entry deleted between reading the directory and stat'ing it, and to
     * one this process may not stat at all. None of the three can be searched, and none is a reason
     * to abandon the rest of the workspace, so they are reported as neither file nor directory and
     * the walk steps over them. A failure is cached like any other answer, so a missing entry costs
     * one failed syscall rather than one per question asked about it.
     */
    protected get stat(): fs.Stats | null {
        return this._stat.get();
    }
    protected _stat = new Lazy<fs.Stats | null>(() => this.statEntry());

    protected statEntry(): fs.Stats | null {
        try {
            return fs.statSync(this.FullPath);
        } catch {
            return null;
        }
    }

     /**
     * Get file extensions which should be ignored when file search.
     *
     * Defaults to excluding nothing. The previous default of [''] excluded *everything*, because
     * an empty pattern matches every extension - reachable by clearing the setting in settings.json.
     */
    protected get ExcludedFileExtensions(): string[] {
        return this._excludedFileExtensions.get();
    }
    protected _excludedFileExtensions = new Lazy(
        () => SeekedFileModel.normalizeExcludedExtensions(this._dao.getSettingValue('exclude', [] as string[])));

    /**
     * The setting is declared as a list of extensions, but settings.json can hold anything, and
     * this extension used to declare the setting as a string - so a comma separated string is
     * still accepted rather than failing the whole grep on `configured.map is not a function`.
     * Extensions are compared lower case and without the decorations people write around them,
     * so "  .DLL " and "dll" mean the same thing.
     */
    protected static normalizeExcludedExtensions(configured: unknown): string[] {
        const candidates = Array.isArray(configured) ? configured
            : (typeof configured === 'string' ? configured.split(",") : []);

        return candidates
            .filter((extension): extension is string => typeof extension === 'string')
            .map(extension => extension.trim().replace(/^\./, "").toLowerCase())
            .filter(extension => extension.length > 0);
    }


    /**
     * You should ignore hidden file when file seek.
     */
    protected ignoreHiddenFile(): boolean {
        return this._ignoreHiddenFile.get();
    }
    protected _ignoreHiddenFile = new Lazy(() => this._dao.getSettingValue('ignoreHiddenFile', true));



    /**
     * Check if passed file is binary or not.
     * This is a cheap implementation to determine if passed file is binary or not.
     * This function determine passed file as binary if file contains code under the ascii 08.
     *
     * Only the leading bytes are read. This used to reach for BufferContent, which loads the whole
     * file - so a large binary sitting in the workspace was read into memory in full purely to
     * look at its first 512 bytes, and then thrown away unread, since the walk skips binaries.
     */
    public get seemsBinary(): boolean {
        return this._seemsBinary.get();
    }
    protected _seemsBinary = new Lazy(() => {
        const head = this.readHead(SeekedFileModel.BINARY_SNIFF_BYTE_COUNT);
        // Every byte is 0-255, so this is the same test as the old list of [0..8].
        return head.some(byte => byte <= SeekedFileModel.HIGHEST_BINARY_CONTROL_BYTE);
    });

    protected static readonly BINARY_SNIFF_BYTE_COUNT = 512;
    protected static readonly HIGHEST_BINARY_CONTROL_BYTE = 8;

    /**
     * The first byteCount bytes of the file, or fewer when the file is shorter.
     */
    protected readHead(byteCount: number): Buffer {
        const buffer = Buffer.alloc(byteCount);
        const descriptor = fs.openSync(this.FullPath, 'r');
        try {
            const bytesRead = fs.readSync(descriptor, buffer, 0, byteCount, 0);
            return buffer.subarray(0, bytesRead);
        } finally {
            fs.closeSync(descriptor);
        }
    }
}