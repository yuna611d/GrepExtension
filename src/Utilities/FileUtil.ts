import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import {
    isNull
} from 'util';
import { Configuration } from '../Configuration';
import { UtilFactory, UtilBase } from './UtilBase';


export class FileUtilFactory extends UtilFactory {

    public retrieve() {
        let format = this._conf.getOutputContentFormat();
        return new FileUtil(this._conf, format);
    }
}

export class FileUtil extends UtilBase {

    public get baseDir() {
        return this._baseDir;
    }
    private _baseDir: string = "";

    private get resultFileName() {
        return this._resultFileName;
    }
    private _resultFileName: string;

    public get resultFilePath() {
        return this._resultFilePath = this.baseDir + this.dirSeparator + this.resultFileName;
    }
    private _resultFilePath: string = this.resultFileName;

    /**
     * Get the separator of file. 
     */
    public get dirSeparator() {
        if (isNull(this._dirSeparator)) {
            let osType = os.type();
            if (osType === 'Windows_NT') {
                return this._dirSeparator =  "\\";
            } else {
                return this._dirSeparator = "/";
            }
        }
        return this._dirSeparator;
    }
    private _dirSeparator: string | null = null;

    public get encoding() {
        return this._encoding;
    }
    private _encoding = "utf-8";

    public get initialLastLine() {
        return this._initailLastLine;
    }
    private _initailLastLine = 0;


    private _excludeFileExtensions: string[] = [""];


    constructor(conf: Configuration, extension: string) {
        super(conf);
        // Configuration for exculueded extensions
        this._excludeFileExtensions = this._conf.getExcludedFileExtensions();
        // Configuration for output file name
        this._resultFileName = this._conf.getOutputFileName() + "." + extension;
        // Configuration for base directory
        this._baseDir = this._conf.getBaseDir();
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
        const lastLine = editor.document.lineCount;
        if (this._initailLastLine === 0) {
            this._initailLastLine = lastLine;
        }
        return new vscode.Position(lastLine, 0);
    }

    public async insertText(editor: vscode.TextEditor, content: string): Promise<number> {
        const insertedLine = () => { const lineCount = editor.document.lineCount; return lineCount === 0 ? 0 : lineCount - 1;};
        await editor.edit(editBuilder => {
            if (content === "") {
                return;
            }
    
            let lineBreakText = content + this._conf.LINE_BREAK;
            let position = this.getPosition(editor);
            editBuilder.insert(position, lineBreakText);
            return insertedLine();
        });
        return insertedLine();
    }
}