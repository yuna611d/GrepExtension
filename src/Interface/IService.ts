import * as vscode from 'vscode';

export interface IService {
    doService(): void;
}

export abstract class AbsOptionalService implements IService {
    protected resultFilePath: string = "";
    protected ranges: Array<vscode.Range> = [];
    protected editor: vscode.TextEditor | null = null;

    abstract doService(): AbsOptionalService;

    setParam(arg: string | Array<vscode.Range> | vscode.TextEditor): AbsOptionalService {
        const type = typeof(arg);
        switch (type) {
            case 'string':
                this.resultFilePath = arg as string;
                break;
            default:
                if (arg instanceof Array) {
                    this.ranges = arg as Array<vscode.Range>;
                } else {
                    this.editor = arg as vscode.TextEditor;
                }
                break;
        }
        return this;
    }


}