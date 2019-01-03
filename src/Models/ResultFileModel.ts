import { isNull, isNullOrUndefined } from "util";
import { Common } from "../Commons/Common";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileModel } from "./FileModel";

export class ResultFileModel extends FileModel {

    public get initialLastLine() {
        return this._initailLastLine;
    }
    protected _initailLastLine = 0;


    //--- Overide Functions ---

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
            // TOOD json format will be impelemented in the future
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
    public get FilePath() {
        return Common.BASE_DIR + Common.DIR_SEPARATOR + this.FileNameWithExtension;
    }

    //--- Overide Functions ---



    public addNewFile(): string {
        // TODO use encoding which is defined in config file
        // create result file
        fs.appendFileSync(this.FilePath, '', this.encoding);
        return this.FilePath;
    }


    protected getPosition(editor: vscode.TextEditor) {
        const lastLine = editor.document.lineCount;
        if (this._initailLastLine === 0) {
            this._initailLastLine = lastLine;
        }
        return new vscode.Position(lastLine, 0);
    }


    public async insertText(content: string): Promise<number> ;
    public async insertText(content: string, editor: vscode.TextEditor): Promise<number> ;


    public async insertText(content: string, editor?: vscode.TextEditor): Promise<number> {

        if (!isNullOrUndefined(editor)) {
            this._editor = editor;
        }

        const insertedLine = () => { const lineCount = this._editor!.document.lineCount; return lineCount === 0 ? 0 : lineCount - 1;};
        await this._editor!.edit(editBuilder => {
            if (content === "") {
                return;
            }
    
            let position = this.getPosition(this._editor!);
            editBuilder.insert(position, content);
            return insertedLine();
        });
        return insertedLine();
    }


    public set editor(editor: vscode.TextEditor) {
        this._editor = editor;
    }
    private _editor: vscode.TextEditor | undefined;

}