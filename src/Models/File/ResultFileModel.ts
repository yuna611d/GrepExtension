import { isNull } from "util";
import { Common } from "../../Commons/Common";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileModel } from "./FileModel";

export class ResultFileModel extends FileModel {

    public get initialLastLine() {
        return this._initialLastLine;
    }
    protected _initialLastLine = 0;
    private _editor: vscode.TextEditor | undefined;


    //--- Override Functions ---

    /**
     * Output file name.
     */
    public get FileName(): string {
        if (isNull(this._fileName)) {
            const defaultFileName = 'grep2File.g2f';
            // configuration for output file name
            return this._fileName = this._dao.getSettingValue('outputFileName', defaultFileName);    
        }
        return this._fileName;
    }
    protected _fileName: string | null = null;

    /**
     * Output content format(extension).
     * You can opt from txt, tsv, csv.
     */
    public get FileExtension(): string {
        if (isNull(this._fileExtension)) {
            const defaultFormat = "txt";
            // TODO json format will be implemented in the future
            const allowedContentFormats = ["txt", "tsv", "csv", "json"];
    
            const outputContentFormat: string = this._dao.getSettingValue('outputContentFormat', defaultFormat);
            if (allowedContentFormats.indexOf(outputContentFormat) === -1) {
                return this._fileExtension = defaultFormat;
            } else {
                return this._fileExtension = outputContentFormat;
            }
        }
        return this._fileExtension;
    }
    protected _fileExtension: string | null = null;

    /**
     * Output filename with extension
     */
    public get FileNameWithExtension(): string {
        return this.FileName + "." + this.FileExtension;
    }

    /**
     * Output file path
     */
    public get FullPath() {
        return Common.BASE_DIR + Common.DIR_SEPARATOR + this.FileNameWithExtension;
    }

    //--- Override Functions ---



    public addNewFile(): ResultFileModel {
        // TODO use encoding which is defined in config file
        // create result file
        fs.appendFileSync(this.FullPath, '', this.encoding);
        return this;
    }

    /**
     * Initalize initalLastLine
     * @param editor 
     */
    public initialize(editor: vscode.TextEditor) {
        this._editor = editor;
        this._initialLastLine = this._initialLastLine === 0 ? 0 : editor.document.lineCount;
    }

    protected getPosition(editor: vscode.TextEditor): vscode.Position {
        return new vscode.Position(this.getLastLine(editor), 0);
    }
    protected getLastLine(editor: vscode.TextEditor): number {
        return editor.document.lineCount;
    }


    public async insertText(content: string): Promise<number> {
        const editor = this._editor!;

        await editor.edit(editBuilder => {
            if (content === "") { return; }
            editBuilder.insert(this.getPosition(editor), content);
        });

        // return inserted line number
        const lineCount = this.getLastLine(editor); 
        return lineCount === 0 ? 0 : lineCount - 1;
    }

    public getText(): string {
        const editor = this._editor!;
        return editor.document.getText();
    }

}