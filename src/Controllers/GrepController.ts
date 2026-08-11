'use strict';
import * as vscode from 'vscode';
import { GrepService } from '../Services/GrepService';
import { DecorationService} from '../Services/DecorationService';
import * as ib from '../InteractionItems/InputBox';
import { SettingDao } from '../DAO/SettingDao';
import { Common } from '../Commons/Common';
import { Message } from '../Commons/Message';
import { FileModelFactory } from '../ModelFactories/FileModelFactory';

/**
 * The result file path is built as baseDir + separator + fileName. With no workspace open
 * Common.BASE_DIR is "", so that resolves against the filesystem root - "\grep2File.g2f.txt"
 * becomes C:\grep2File.g2f.txt on Windows, writing outside any project the user opened, and
 * fails with EACCES elsewhere. Either way there is nothing worth grepping, so refuse early.
 */
export function isUsableWorkspaceRoot(baseDir: string): boolean {
    return baseDir.trim() !== "";
}

export class GrepController {

    constructor() {
        Common.DAO = new SettingDao();
    }

    public async doAction(): Promise<void> {
        if (!this.ensureWorkspace()) { return; }

        const inputBox = new ib.SearchWordInputBox();
        // Pass a bound arrow function: `this.callback` on its own loses its receiver.
        await inputBox.showInputBox(v => this.callback(v));
    }

    public async doActionWithParam(v: string): Promise<void> {
        if (!this.ensureWorkspace()) { return; }
        await this.callback(v);
    }

    protected ensureWorkspace(): boolean {
        if (isUsableWorkspaceRoot(Common.BASE_DIR)) { return true; }
        vscode.window.showErrorMessage(Message.MESSAGE_NO_WORKSPACE);
        return false;
    }

    protected async callback(v: string | undefined): Promise<void> {
        const searchWord = v;

        // Prepare configuration and utilities
        const resultFile = new FileModelFactory().retrieve();

        // Prepare services to be used
        await new GrepService(resultFile, searchWord, new DecorationService()).doService();
    }
}
