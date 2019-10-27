import * as fs from 'fs';
import { isNull, isNullOrUndefined } from 'util';
import { Common } from '../../Commons/Common';
import { BaseDAO } from '../../DAO/BaseDao';
import { FileModel } from './FileModel';

export class SeekedFileModel extends FileModel {

    public readonly TargetDir: string;
    protected excludedFileNames: string[];

    constructor(dao: BaseDAO, fileNameWithExtension: string, targetDir: string, excludedFileNames: string[]) {
        super(dao);
        this.FileNameWithExtension = fileNameWithExtension;
        this.TargetDir = targetDir;
        this.excludedFileNames = excludedFileNames;
    }

    //--- Override Functions ---
    public get FileName() {
        if (isNullOrUndefined(this._fileName)) {
            const fileInfo = this.getFileNameAndExtension();
            this._fileName = fileInfo[0];
            this._fileExtension = fileInfo[1];            
        }
        return this._fileName;
    }
    protected _fileName: string | undefined;

    public get FileExtension() {
        if (isNullOrUndefined(this._fileExtension)) {
            const fileInfo = this.getFileNameAndExtension();
            this._fileName = fileInfo[0];
            this._fileExtension = fileInfo[1];
        }
        return this._fileExtension;        
    }
    protected _fileExtension: string | undefined;

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

        const fileExtension = fileInfos[fileInfos.length -1];
        const fileNameAndDirs = fileInfos[fileInfos.length -2].split(Common.DIR_SEPARATOR);
        const fileName = fileNameAndDirs[fileNameAndDirs.length - 1];
        // return filename and extension
        return [fileName, fileExtension];
    }

    public get Content(): string {
        if (isNullOrUndefined(this._content)) {
            this._content = this.BufferContent.toString(this.encoding);
        }
        return this._content;
    }
    protected _content: string | undefined;

    protected get BufferContent(): Buffer {
        if (isNullOrUndefined(this._bufferContent)) {
            this._bufferContent = fs.readFileSync(this.FullPath, null);
        }
        return this._bufferContent;
    }
    protected _bufferContent: Buffer | undefined;

    public isExcludedFile(): boolean {
        // don't read files which have extension specified
        for (let ext of this.ExcludedFileExtensions) {
            const re = new RegExp(ext, "i");
            if (re.test(this.FileExtension)) {
                return true;
            }
        }
        // don't read result file.
        return this.excludedFileNames.includes(this.FileNameWithExtension);
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
     */
    protected get ExcludedFileExtensions(): string[] {
        if (isNull(this._excludedFileExtensions)) {
            return this._excludedFileExtensions = this._dao.getSettingValue('exclude',['']);
        }
        return this._excludedFileExtensions;
    }
    protected _excludedFileExtensions: string[] | null = null;


    /**
     * You should ignore hidden file when file seek.
     */
    protected ignoreHiddenFile(): boolean {
        if (isNull(this._ignoreHiddenFile)) {
            let ignoreHiddenFile: boolean = this._dao.getSettingValue('ignoreHiddenFile', true);
            return this._ignoreHiddenFile = ignoreHiddenFile;    
        }
        return this._ignoreHiddenFile;
    }
    protected _ignoreHiddenFile: boolean | null = null;



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