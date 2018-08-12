import * as fs from 'fs';
import {
    isNull
} from 'util';
import { Configuration } from './Configuration';

export class FileUtil {

    private _config: Configuration;

    private _baseDir: string = "";
    public get baseDir() {
        return this._baseDir;
    }

    private _resultFileName: string;
    private get resultFileName() {
        return this._resultFileName;
    }
    private _resultFilePath: string = this.resultFileName;
    public get resultFilePath() {
        return this._resultFilePath = this.baseDir + this.dirSeparator + this.resultFileName;
    }

    private _dirSeparator: string;
    public get dirSeparator() {
        return this._dirSeparator;
    }

    private _encoding = "utf-8";
    public get encoding() {
        return this._encoding;
    }

    private _excludeFileExtensions: [string] = [""];

    constructor(conf: Configuration) {
        this._config = conf;
        // SetDirectorySeparator
        this._dirSeparator = this._config.getDirSeparator();
        // configuration for exculueded extensions
        this._excludeFileExtensions = this._config.getExcludedFileExtension();
        // configuration for output file name
        this._resultFileName = this._config.getOuputFileName();
        // configuration for base directory
        this._baseDir = this._config.getBaseDir();

    }



    /**
     * 
     * @param fileNmae fileNmae
     */
    public isExcludedFile(fileNmae: string): boolean {
        let fileInfos = fileNmae.split('.');
        let extension = fileInfos[fileInfos.length -1];
        if (this._excludeFileExtensions.indexOf(extension) >= 0) {
            return true;
        }
        return false;
    }

    public addNewFile() {
        // TODO use encoding which is defined in config file
        // create result file
        fs.appendFileSync(this.resultFilePath, '', this.encoding);
    }

    public getFilePath(targetDir: string, fileName: string) {
        return targetDir + this.dirSeparator + fileName;
    }

    public getTargetDir(nextTargetDir: string | null) {
        return (isNull(nextTargetDir)) ? this.baseDir : nextTargetDir;
    }
}