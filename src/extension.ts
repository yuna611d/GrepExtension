'use strict';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';
import os = require('os');
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

        let service = new GrepService(v);
        service.serve();

        return () => {};
    }
}


export class GrepService {
    private LINE_BREAK = "\n";
    private DIR_SEPARATPR = "/";
    private position = this.getPosition();
    protected editBuilder: vscode.TextEditorEdit | null = null;

    protected searchWord = "";
    protected baseDir = "";

    protected encoding = "utf-8";
    protected resultFileName = "grep2File.g2f.txt";
    protected resultFilePath = "";

    protected isRegExpMode = false;
    protected regExpOptions = "";

    constructor(searchWord: string | undefined) {

        // SetDirectorySeparator
        let osType = os.type();
        if (osType === 'Windows_NT') {
            this.DIR_SEPARATPR = "\\";
        } else {
            this.DIR_SEPARATPR = "/";
        }

        // Check search word exisntance and reg exp mode
        if (!isNullOrUndefined(searchWord)) {
            this.searchWord = searchWord;
            this.setRegExpItemsIfRegExpPattern(searchWord);
        }

        // TOOD in the futre, multi work space should be applye
        let workspaceForlders = vscode.workspace.workspaceFolders;
        if (!isNullOrUndefined(workspaceForlders) && workspaceForlders.length !== 0) {
            this.baseDir = workspaceForlders[0].uri.fsPath;
            // create result file
            this.resultFilePath = this.baseDir + this.DIR_SEPARATPR + this.resultFileName;
            // TODO use encoding which is defined in config file
            fs.appendFileSync(this.resultFilePath, '', this.encoding);
        }

    }
    public serve() {

        // Get search word
        let searchWord = this.searchWord;
        if (isNullOrUndefined(searchWord) || searchWord.length === 0) {
            vscode.window.showInformationMessage("Sorry, I can't grep this word...");
            return;
        }

        // Open result file (fire onDidOpenTextDocument Event)
        vscode.workspace.openTextDocument(this.resultFilePath).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
                // Do grep and output its results.
                editor.edit(editBuilder => {
                    this.editBuilder = editBuilder;
                    this.insertText(this.getTitle());
                    this.insertText(this.getContent("filePath","lineNumber","TextLine"));
                    this.grep();
                    vscode.window.showInformationMessage("Grep is finished...");
                    this.editBuilder = null;
                });
            });
        });
    }



    /**
     * Read file and check if line contain search word or not.
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
            let filePath = targetDir + this.DIR_SEPARATPR+ file;
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
        let contents = fs.readFileSync(filePath, this.encoding);
        let lines = contents.split(this.LINE_BREAK);
        let lineNumber = 1;
        lines.forEach(line => {
            if (this.isContainSearchWord(line)) {
                let contentText = this.getContent(filePath, lineNumber.toString(), line);
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
        let re = null;
        if (this.isRegExpMode && this.regExpOptions.length > 0) {
            re = new RegExp(this.searchWord, this.regExpOptions);
        } else {
            re = new RegExp(this.searchWord);
        }

        if (isNull(re)) {
            return false;
        }

        if (re.test(targetString)) {
            return true;
        }

        return false;
    }

    /**
     * Set parameters for regulare expression.
     * @param searchWord: searchWord
     */
    protected setRegExpItemsIfRegExpPattern(searchWord: string) {
        //  re/<pattern>/flags
        let REGEXP_FORMAT_PREFIX = "re/";
        let REGEXP_FORMAT_POSTFIX = "/";
        let ALLOWED_OPTIONS = ["i"];


        let patternStartPos = searchWord.indexOf(REGEXP_FORMAT_PREFIX);
        if (patternStartPos === -1) {
            return;
        }
        patternStartPos += + REGEXP_FORMAT_PREFIX.length


        let patternEndPos = searchWord.lastIndexOf(REGEXP_FORMAT_POSTFIX);
        if (patternEndPos === -1 || patternStartPos >= patternEndPos) {
            return;
        }

        let pattern = searchWord.substring(patternStartPos, patternEndPos);
        if (pattern.length === 0) {
            return;
        }

        let options = "";
        let tmpOptions = searchWord.substring(patternEndPos + 1);
        for (let i = 0; i < tmpOptions.length; i++) {
            let option = tmpOptions.charAt(i);
            if (ALLOWED_OPTIONS.indexOf(option) > -1) {
                options += option;
            } 
        }


        // Configure for regexp
        this.isRegExpMode = true;
        this.searchWord = pattern;
        this.regExpOptions = options;

    }

    protected getTitle() {
        let title = `Search Dir: ${this.baseDir}`;
        title += this.LINE_BREAK + `Search Word: ${this.searchWord}`;
        title += this.LINE_BREAK + "RegExpMode: ";
        title += this.isRegExpMode ? "ON" : "OFF";
        return title;
    }

    protected getContent(filePath: string, lineNumber: string, line: string) {
        let content = this.getFormattedContent(["", filePath, lineNumber, line]);
        return content;
    }

    protected getFormattedContent(contents: string[]) {
        let separator = "\t";
        return contents.join(separator);
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
    protected getTargetDir(currentDir: string, nextDir: string): string {
        let targetDir = currentDir;
        let separator = "";

        let osType = os.type();
        if (osType === 'Windows_NT') {
            separator = "\\";
        } else {
            separator = "/";
        }

        if (!targetDir.endsWith(separator)) {
            targetDir = targetDir + separator;
        }
        if (nextDir !== "") {
            targetDir = targetDir + nextDir + separator;
        }

        return targetDir;
    }

}