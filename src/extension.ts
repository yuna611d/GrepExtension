'use strict';
import { GrepController } from './Controllers/GrepController';
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.commands.registerCommand('extension.grepResult2File', () => {
        const controller = new GrepController();
        controller.doAction();
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

