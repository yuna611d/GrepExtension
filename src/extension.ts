'use strict';
import * as vscode from 'vscode';
import {
    isNullOrUndefined
} from 'util';
import * as fs from 'fs';
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

        this.grep();

    }

    // TODO now implementing
    /**
     * Search word in current directory and output found result in each.
     */
    protected grep() {


        new Promise((resolve, reject) => {
            fs.readdir(this.baseDir, (err, files) => {
                if (err) {
                    {
                        reject(err);
                    }
                }
                resolve(files);
            });
        }).then((files) => {


            this.editor!.edit(editBuilder => {

                this.insertText(editBuilder, this.getTitle());

                (files as Array < string > ).forEach(file => {


                    let filePath = this.baseDir + "/" + file;
                    let stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        // TODO grep file recursively

                    } else if (stat.isFile()) {

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
                });
                
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

    protected async writeContent(content: string) {
        await this.editor!.edit((editBuilder) => {
            this.insertText(editBuilder, content);
        });
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

    // TODO separate functions which are related to content.
    private getTitle() {
        return `Search Dir: ${this.baseDir}\nSearch Word: ${this.searchWord}`;
    }

    private getContent(filePath: string, lineNumber: number, line: string) {
        return `${filePath} : ${lineNumber.toString()} : ${line}`;
    }


}