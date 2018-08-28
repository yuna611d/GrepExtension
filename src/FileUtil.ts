import * as fs from 'fs';
import * as vscode from 'vscode';
import {
    isNull
} from 'util';
import { Configuration } from './Configuration';


export class FileUtilFactory {
    private _conf: Configuration;

    constructor(configuration: Configuration) {
        this._conf = configuration;
    }
    public retrieve() {
        let format = this._conf.getOutputContentFormat();
        return new FileUtil(this._conf, format);
    }
}

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

    private _excludeFileExtensions: string[] = [""];


    constructor(conf: Configuration, extension: string) {
        this._config = conf;
        // SetDirectorySeparator
        this._dirSeparator = this._config.getDirSeparator();
        // configuration for exculueded extensions
        this._excludeFileExtensions = this._config.getExcludedFileExtensions();
        // configuration for output file name
        this._resultFileName = this._config.getOutputFileName() + "." + extension;
        // configuration for base directory
        this._baseDir = this._config.getBaseDir();

    }

    /**
     * 
     * @param fileNmae fileNmae
     */
    public isExcludedFile(fileName: string): boolean {
        let fileInfos = fileName.split('.');
        let extension = fileInfos[fileInfos.length -1];

        // don't read files which have extension specified
        if (this._excludeFileExtensions.indexOf(extension) >= 0) {
            return true;
        }

        // don't read result file.
        if (fileName.startsWith(this._resultFileName)) {
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

    protected getPosition(editor: vscode.TextEditor) {
        let lastLine = editor.document.lineCount;
        let position = new vscode.Position(lastLine, 0);
        return position;
    }

    public async insertText(editor: vscode.TextEditor, content: string) {
        await editor.edit(editBuilder => {
            if (content === "") {
                return;
            }
    
            let lineBreakText = content + this._config.LINE_BREAK;
            let position = this.getPosition(editor);
            editBuilder.insert(position, lineBreakText);
        });
    }
}