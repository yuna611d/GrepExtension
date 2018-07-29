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
    protected editBuilder: TextEditorEdit | null = null;

    protected searchWord = "";
    protected baseDir = "";

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
            this.editBuilder = editBuilder;
            this.insertText(this.getTitle());
            this.grep();
            vscode.window.showInformationMessage("Grep is finished...");
            this.editBuilder = null;
        });

    }

    /**
     * Read file and 
     * @param nextTargetDir directory where is next target.
     */
    protected grep(nextTargetDir: string | null = null) {
        // Get target directory
        let targetDir = (isNull(nextTargetDir)) ? this.baseDir : nextTargetDir;
        if (isNull(targetDir)) {
            return;
        }
        // Get file or directory names in targetDir
        let files = fs.readdirSync(targetDir);

        (files as string[]).forEach(file => {

            // Get the file path
            let filePath = targetDir + "/" + file;
            // Check if the file path is file or directory
            let stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // if file path is directory, regrep by using filepath as nextTargetDir
                this.grep(filePath);
            } else if (stat.isFile()) {
                // if file path is file, read file and insert grep results to editor
                this.readFileAndInsertText(filePath);
            }
        });


    }


    /**
     * Read file and insert text to activeeditor.
     * @param filePath filePath
     */
    protected readFileAndInsertText(filePath: string) {
        let contents = fs.readFileSync(filePath, 'utf-8');
        let lines = contents.split(this.LINE_BREAK);
        let lineNumber = 1;
        lines.forEach(line => {
            if (this.isContainSearchWord(line)) {
                let contentText = this.getContent(filePath, lineNumber, line);
                console.log(contentText);
                this.insertText(contentText);
            }
            lineNumber++;
        });
    }


    /**
     * Check if line contains search word or not.
     * @param targetString 
     */
    protected isContainSearchWord(targetString: string) {
        // TODO take care of regexp and plain text
        let re = new RegExp(this.searchWord);
        if (re.test(targetString)) {
            return true;
        }

        return false;
    }

    protected getTitle() {
        return `Search Dir: ${this.baseDir}\nSearch Word: ${this.searchWord}`;
    }

    protected getContent(filePath: string, lineNumber: number, line: string) {
        return `${filePath} : ${lineNumber.toString()} : ${line}`;
    }



    private insertText(content: string) {
        if (isNull(this.editBuilder)) {
            return;
        }
        let lineBreakText = content + this.LINE_BREAK;
        this.editBuilder.insert(this.position(), lineBreakText);
    }


    private getPosition() {
        var line = 0;
        return () => {
            return new vscode.Position(line++, 0);
        };
    }
}