import * as vscode from 'vscode';

export interface IService {
    doService(): void;
}

export abstract class AbsOptionalService implements IService {
    protected ranges: Array<vscode.Range> = [];
    protected editor: vscode.TextEditor | null = null;

    abstract doService(): AbsOptionalService;

    setRanges(ranges: Array<vscode.Range>): AbsOptionalService {
        this.ranges = ranges;
        return this;
    }

    setEditor(editor: vscode.TextEditor): AbsOptionalService {
        this.editor = editor;
        return this;
    }

}