'use strict';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as ib from './InputBox';

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('extension.grepResult2File', () => {
        let controller = new GrepController();
        controller.doAction();

    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

class GrepController {
    public doAction(): void {
        let inputBox = new ib.SearchWordInputBox();
        inputBox.showInputBox(this.callback);
    }

    protected callback(v: string | undefined) {
        console.log("Callback is called. Assigned value is " + v);

        let service = new GrepSearvice(v);
        service.serve();

        return () => {};
    }
}


export class GrepSearvice {
    private LINE_BREAK = "\n";
    private position = this.getPosition();
    protected editor = vscode.window.activeTextEditor;
    protected searchWord = "";
    protected baseDir = "";
    // protected grepResults = [""];

    constructor(searchWord: string | undefined) {
        if (!isNullOrUndefined(searchWord)) {
            this.searchWord = searchWord;
        }
        if (!isNullOrUndefined(this.editor)) {
            let openedFilePath = this.editor.document.fileName;
            this.baseDir = path.dirname(openedFilePath);
        }
    }
    public serve() {

        let searchWord = this.searchWord;
        if (isNullOrUndefined(searchWord) || searchWord.length === 0) {
            vscode.window.showInformationMessage("Sorry, I can't grep this word...");
            return;
        }

        this.editor!.edit(editBuilder => {
            this.insertText(editBuilder, this.getTitle());
            this.grep(editBuilder);
        });

    }

    // TODO now implementing
    /**
     * Search word in current directory and output found result in each.
     */
    protected grep(editBuilder: vscode.TextEditorEdit, nextTargetDir: string | null = null) {
        let targetDir = (isNull(nextTargetDir)) ? this.baseDir : nextTargetDir;
        if (isNull(targetDir)) {
            return;
        }

        let files = fs.readdirSync(targetDir);

        (files as Array < string > ).forEach(file => {


            let filePath = targetDir + "/" + file;
            let stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                this.grep(editBuilder, filePath);

            } else if (stat.isFile()) {
                this.readFileAndInsertText(editBuilder, filePath);
            }
        });


    }


    /**
     * Read file and insert text to activeeditor.
     * @param editBuilder editBuilder
     * @param filePath filePath
     */
    protected readFileAndInsertText(editBuilder: vscode.TextEditorEdit, filePath: string) {
        let contents = fs.readFileSync(filePath, 'utf-8');
        let lines = contents.split(this.LINE_BREAK);
        let lineNumber = 1;
        lines.forEach(line => {
            if (this.isContainSearchWord(line)) {
                let contentText = this.getContent(filePath, lineNumber, line);
                console.log(contentText);
                this.insertText(editBuilder, contentText);
            }
            lineNumber++;
        });
    }


    /**
     * Check if line contains search word or not.
     * @param textLine 
     */
    protected isContainSearchWord(textLine: string) {
        // TODO take care of regexp and plain text
        let re = new RegExp(this.searchWord);
        if (re.test(textLine)) {
            return true;
        }

        return false;
    }


    protected insertText(editBuilder: vscode.TextEditorEdit, content: string) {
        let lineBreakText = content + this.LINE_BREAK;
        editBuilder.insert(this.position(), lineBreakText);
    }

    private getPosition() {
        var line = 0;
        return () => {
            return new vscode.Position(line++, 0);
        };
    }

    
    private getTitle() {
        return `Search Dir: ${this.baseDir}\nSearch Word: ${this.searchWord}`;
    }

    private getContent(filePath: string, lineNumber: number, line: string) {
        return `${filePath} : ${lineNumber.toString()} : ${line}`;
    }


}