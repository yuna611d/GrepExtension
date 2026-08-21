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
        return this.stat.isFile();
    }

    public get isDirectory(): boolean {
        return this.stat.isDirectory();
    }
    protected get stat() {
        return fs.statSync(this.FullPath);
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
     */
    public get seemsBinary(): boolean {
        const buffer = this.BufferContent;
        const controls = [0,1,2,3,4,5,6,7,8];
        for (let i = 0; i < 512; i++) {
            const c = buffer[i];
            if (controls.indexOf(c) > -1) {
                return true;
            }
        }
        return false;
    }
}