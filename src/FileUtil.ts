import * as os from 'os';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';


export class FileUtil {

    private _baseDir = "";
    public get baseDir() {
        return this._baseDir;
    }

    private resultFileName = "grep2File.g2f.txt";
    private _resultFilePath = "";
    public get resultFilePath() {
        return this._resultFilePath;
    }

    private _dirSeparator = "/";
    public get dirSeparator() {
        return this._dirSeparator;
    }

    private _encoding = "utf-8";
    public get encoding() {
        return this._encoding;
    }

    constructor() {
        // SetDirectorySeparator
        let osType = os.type();
        if (osType === 'Windows_NT') {
            this._dirSeparator = "\\";
        } else {
            this._dirSeparator = "/";
        }

        this.setBaseDir();
    }

    /**
     * Determin directory for initial search path and file path for output result
     */
    protected setBaseDir() {
        // TOOD in the futre, multi work space should be applye
        let workspaceForlders = vscode.workspace.workspaceFolders;
        if (!isNullOrUndefined(workspaceForlders) && workspaceForlders.length !== 0) {
            this._baseDir = workspaceForlders[0].uri.fsPath;
            this._resultFilePath = this.baseDir + this.dirSeparator + this.resultFileName;
        }
    }

    public addNewFile() {
        // TODO use encoding which is defined in config file
        // create result file
        fs.appendFileSync(this.resultFilePath, '', this.encoding);
    }

    public getFilePath(targetDir:string, fileName: string) {
        return targetDir + this.dirSeparator + fileName;
    }

    public getTargetDir(nextTargetDir: string | null) {
        return (isNull(nextTargetDir)) ? this.baseDir : nextTargetDir;
    }
}