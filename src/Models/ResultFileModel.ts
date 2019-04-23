import { isNull } from "util";
import { Common } from "../Commons/Common";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileModel } from "./FileModel";

export class ResultFileModel extends FileModel {

    public get initialLastLine() {
        return this._initialLastLine;
    }
    protected _initialLastLine = 0;


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



    public addNewFile(): string {
        // TODO use encoding which is defined in config file
        // create result file
        fs.appendFileSync(this.FullPath, '', this.encoding);
        return this.FullPath;
    }


    protected getPosition(editor: vscode.TextEditor) {
        const lastLine = editor.document.lineCount;
        if (this._initialLastLine === 0) {
            this._initialLastLine = lastLine;
        }
        return new vscode.Position(lastLine, 0);
    }


    public async insertText(content: string): Promise<number> ;

    public async insertText(content: string): Promise<number> {
        const editor = this._editor;
        const insertedLine = () => { const lineCount = editor!.document.lineCount; return lineCount === 0 ? 0 : lineCount - 1;};
        await editor!.edit(editBuilder => {
            if (content === "") {
                return;
            }
    
            let position = this.getPosition(editor!);
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