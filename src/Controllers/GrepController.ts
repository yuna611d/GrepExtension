'use strict';
import { GrepService } from '../Services/GrepService';
import { DecorationService} from '../Services/DecorationService';
import * as ib from '../InteractionItems/InputBox';
import * as vscode from 'vscode';
import { SettingDAO } from '../DAO/SettingDAO';
import { Common } from '../Commons/Common';
import { FileModelFactory } from '../ModelFactories/FileModelFactory';

export class GrepController {

    constructor() {
        Common.DAO = new SettingDAO();
    }

    public doAction(): void {
        let inputBox = new ib.SearchWordInputBox();
        inputBox.showInputBox(this.callback);
    }

    protected callback(v: string | undefined) {
        const searchWord = v;

        // Prepare configuration and utilities
        const resultFile = new FileModelFactory().retrieve();

        // Prepare services to be used
        const grepService = new GrepService(resultFile, searchWord);
        const decorationService = new DecorationService();

        // Create and Get file path where result is outputted.
        const filePath = resultFile.addNewFile();
        if (grepService.prepareGrep()) {
            vscode.workspace.openTextDocument(filePath).then(doc => {
                vscode.window.showTextDocument(doc).then(async editor => {
                    // Grep word
                    const ranges = await grepService.grep(editor);
                    // Decorate found word
                    await decorationService.decorate(editor, filePath, ranges);
                });
            });    
        }
        return () => {};
    }
}