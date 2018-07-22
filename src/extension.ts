'use strict';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

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
        let inputBox = new SearchWordInputBox();
        inputBox.showInputBox(this.callback);
    }

    protected callback(v: string | undefined) {
        console.log("Callback is called. Assigned value is " + v);

        let service = new GrepSearvice(v);
        service.serve();

        return () => {};
    }
}

interface IInputBox {
    showInputBox(callback: (v: string | undefined) => {}): void;
}

class InputBoxBase implements IInputBox {
    protected option: vscode.InputBoxOptions = {
        prompt: "",
    };
    public showInputBox(callback: (v: string | undefined) => {}): void {
        vscode.window.showInputBox(this.option).then(value => callback(value));
    }
}

// class SearchPathInputBox extends InputBoxBase {
//     option = {
//         prompt: "Input Search Path (absolute path)",
//     };
// }

class SearchWordInputBox extends InputBoxBase {
    option = {
        prompt: "Input Word",
    };
}

export class GrepSearvice {
    protected line = 0;
    protected searchWord = "";
    protected editor = vscode.window.activeTextEditor;
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

        if (isNullOrUndefined(this.editor)) {
            return;
        }

        this.editor.edit((editBuilder) => {
            let searchWord = this.searchWord;
            if (isNullOrUndefined(searchWord) || searchWord.length === 0) {
                vscode.window.showInformationMessage("Sorry, I can't grep this word...");
                return;
            }

            this.insertText(this.getTitle(), editBuilder);
            this.grep(editBuilder);

        });
    }

    // TODO now implementing
    /**
     * Search word in current directory and output found result in each.
     * @param editBuilder 
     */
    protected grep(editBuilder: vscode.TextEditorEdit) {

        fs.readdir(this.baseDir, (err, files) => {
            files.forEach(file => {
                let filePath = this.baseDir + "/" + file;
                let stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    // TODO grep file recursively
                    
                } else if (stat.isFile()) {
                    let stream = fs.createReadStream(filePath, { encoding : "utf8"});
 
                    let reader = readline.createInterface({ input: stream });
                    let lineNumber = 1;
                    reader.on("line", (data) => {                        
                        if (this.isContainSearchWord(data)) {
                            let contentText = this.getContent(filePath, lineNumber, data);
                            console.log(contentText);
                            this.insertText(contentText, editBuilder);
                        }
                        lineNumber++;
                    });
                }
            });
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

    protected insertText(text: string, editBuilder: vscode.TextEditorEdit): void {
        editBuilder.insert(new vscode.Position(this.line++, 0), text);
    }

    // TODO separate functions which are related to content.
    private getTitle() {
        return `Search Dir: ${this.baseDir} \n Search Word: ${this.searchWord}`;
    }

    private getContent(filePath: string, lineNumber: number, line: string) {
        return `${filePath} : ${lineNumber.toString()} : ${line}`;
    }


}