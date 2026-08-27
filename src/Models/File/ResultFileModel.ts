import { Common } from "../../Commons/Common";
import { Lazy } from "../../Commons/Lazy";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileModel } from "./FileModel";

export class ResultFileModel extends FileModel {

    private _editor: vscode.TextEditor | undefined;


    //--- Override Functions ---

    /**
     * Output file name.
     */
    public get FileName(): string {
        return this._fileName.get();
    }
    protected _fileName = new Lazy(() => {
        const defaultFileName = 'grep2File.g2f';
        // configuration for output file name
        return this._dao.getSettingValue('outputFileName', defaultFileName);
    });

    /**
     * Output content format(extension).
     * You can opt from txt, tsv, csv, json.
     */
    public get FileExtension(): string {
        return this._fileExtension.get();
    }
    protected _fileExtension = new Lazy(() => {
        const defaultFormat = "txt";
        const allowedContentFormats = ["txt", "tsv", "csv", "json"];

        const outputContentFormat: string = this._dao.getSettingValue('outputContentFormat', defaultFormat);
        return allowedContentFormats.indexOf(outputContentFormat) === -1 ? defaultFormat : outputContentFormat;
    });

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



    public async addNewFile(): Promise<ResultFileModel> {
        // TODO use encoding which is defined in config file
        // create result file
        await fs.promises.appendFile(this.FullPath, '', { encoding: this.encoding as BufferEncoding });
        return this;
    }

    /**
     * Bind the editor that every later insert writes into.
     */
    public initialize(editor: vscode.TextEditor) {
        this._editor = editor;
    }

    /**
     * Write what the grep produced to the file it was named after.
     *
     * Everything up to here is an editor edit, which leaves the document dirty and the file on
     * disk exactly as addNewFile() left it: empty. For an extension whose whole job is putting
     * grep results in a file, that meant the file never actually held any - close the editor
     * without saving and the results were gone, and anything else reading the file saw nothing.
     *
     * Saving through the document rather than writing the bytes underneath it keeps the editor
     * and the file in agreement; writing behind VS Code's back would leave the document dirty
     * and set up a conflict the next time anything saved it.
     *
     * Returns whether the file was written. A save can legitimately fail - a read-only file, a
     * directory gone - and the caller says so rather than leaving the user thinking it worked.
     */
    public async save(): Promise<boolean> {
        if (this._editor === undefined) {
            return false;
        }
        return await this._editor.document.save();
    }

    /**
     * Drop whatever the previous grep left in the document.
     *
     * Done through the editor rather than the file: nothing saves the result document, so the
     * previous grep's output is unsaved editor state that truncating the file would not touch.
     */
    public async clear(): Promise<void> {
        const editor = this._editor!;
        const document = editor.document;
        if (document.getText().length === 0) {
            return;
        }

        await editor.edit(editBuilder => {
            // A position past the last line is clamped to the end of the document.
            editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0)));
        });
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

    /**
     * Insert a block made of several newline-terminated chunks (e.g. several grep matches
     * concatenated together) with a single editor edit, instead of one edit per chunk.
     * Each editor.edit() call is a round-trip to the main/renderer process, so issuing one per
     * matched line makes grepping extremely sensitive to whatever else VS Code's UI thread is
     * doing (typing, clicking, etc.); batching multiple chunks into one edit avoids that.
     *
     * Returns the 0-indexed document line of the *first* chunk. Because every previous insert
     * here always ends with a line break, the document's current last line is empty and gets
     * filled by the first chunk, so that starting line is (current line count - 1); each
     * subsequent chunk then lands on the following line.
     */
    public async insertTextBlock(content: string): Promise<number> {
        const editor = this._editor!;
        const startLine = Math.max(this.getLastLine(editor) - 1, 0);

        if (content === "") { return startLine; }

        await editor.edit(editBuilder => {
            editBuilder.insert(this.getPosition(editor), content);
        });

        return startLine;
    }

}