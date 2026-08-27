'use strict';
import { GrepController } from './Controllers/GrepController';
import { Message } from './Commons/Message';
import { DecorationService } from './Services/DecorationService';
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.commands.registerCommand('extension.grepResult2File', async () => {
        const controller = new GrepController();
        try {
            // Awaited so failures raised before grep()'s own try/catch - opening the result
            // document, or creating it in the first place - still reach the user instead of
            // becoming a silent unhandled rejection.
            await controller.doAction();
        } catch (e) {
            console.error(e);
            vscode.window.showErrorMessage(Message.MESSAGE_ERROR);
        }
    });

    context.subscriptions.push(disposable);
    // The highlight type outlives any one search - it is shared by all of them - so it is the
    // extension's to release rather than a search's.
    context.subscriptions.push({ dispose: () => DecorationService.dispose() });
}

// this method is called when your extension is deactivated
export function deactivate() {}
