'use strict';
import * as vscode from 'vscode';
import { Message } from '../Commons/Message';

export interface IInputBox {
    showInputBox(callback: (v: string | undefined) => void | Promise<void>): Promise<void>;
}

export class InputBoxBase implements IInputBox {
    protected option: vscode.InputBoxOptions = {
        prompt: Message.MESSAGE_PROMPT_EMPTY,
    };
    /**
     * Resolves only once the callback has finished, so a caller awaiting this also awaits the
     * work it kicked off. Previously the promise was dropped here, which meant any failure in
     * the callback surfaced as an unhandled rejection with no feedback to the user.
     */
    public async showInputBox(callback: (v: string | undefined) => void | Promise<void>): Promise<void> {
        const value = await vscode.window.showInputBox(this.option);
        await callback(value);
    }
}

export class SearchWordInputBox extends InputBoxBase {
    option = {
        prompt: Message.MESSAGE_PROMPT_INPUT_WORD,
    };
}