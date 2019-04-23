'use strict';
import * as vscode from 'vscode';
import { Message } from '../Commons/Message';

export interface IInputBox {
    showInputBox(callback: (v: string | undefined) => {}): void;
}

export class InputBoxBase implements IInputBox {
    protected option: vscode.InputBoxOptions = {
        prompt: Message.MESSAGE_PROMPT_EMPTY,
    };
    public showInputBox(callback: (v: string | undefined) => {}): void {
        vscode.window.showInputBox(this.option).then(value => callback(value));
    }
}

export class SearchWordInputBox extends InputBoxBase {
    option = {
        prompt: Message.MESSAGE_PROMPT_INPUT_WORD,
    };
}