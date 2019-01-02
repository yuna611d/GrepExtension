'use strict';
import * as vscode from 'vscode';

export interface IInputBox {
    showInputBox(callback: (v: string | undefined) => {}): void;
}

export class InputBoxBase implements IInputBox {
    protected option: vscode.InputBoxOptions = {
        prompt: "",
    };
    public showInputBox(callback: (v: string | undefined) => {}): void {
        vscode.window.showInputBox(this.option).then(value => callback(value));
    }
}

export class SearchWordInputBox extends InputBoxBase {
    option = {
        prompt: "Input Word",
    };
}