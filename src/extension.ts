'use strict';
import * as ib from './InputBox';
import * as cu from './ContentUtil';
import * as fu from './FileUtil';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';


const CU = cu.ContentUtil;

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

        let searchWord = v;
        let service = new GrepService(new fu.FileUtil(), searchWord);
        service.serve();

        return () => {};
    }
}


export class GrepService {

    private FU: fu.FileUtil;

    private position = this.getPosition();
    protected editBuilder: vscode.TextEditorEdit | null = null;

    protected searchWord = "";


    protected isRegExpMode = false;
    protected regExpOptions = "";

    constructor(fu: fu.FileUtil, searchWord: string | undefined) {
        this.FU = fu;

        // Check search word exisntance and reg exp mode
        if (!isNullOrUndefined(searchWord)) {
            this.searchWord = searchWord;
            this.setRegExpItemsIfRegExpPattern(searchWord);
        }


    }
    public serve() {


        // Get search word
        let searchWord = this.searchWord;
        if (isNullOrUndefined(searchWord) || searchWord.length === 0) {
            vscode.window.showInformationMessage("Sorry, I can't grep this word...");
            return;
        }

        // create file, which is written grep result.
        this.FU.addNewFile();

        // Open result file (fire onDidOpenTextDocument Event)
        vscode.workspace.openTextDocument(this.FU.resultFilePath).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
                // Do grep and output its results.
                editor.edit(editBuilder => {
                    this.editBuilder = editBuilder;
                    this.insertText(CU.getTitle(this.FU.baseDir, this.searchWord, this.isRegExpMode));
                    this.insertText(CU.getContent("filePath", "lineNumber", "TextLine"));
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
        let targetDir = this.FU.getTargetDir(nextTargetDir);
        if (isNull(targetDir)) {
            return;
        }

        // Get file or directory names in targetDir
        let files = fs.readdirSync(targetDir);

        (files as string[]).forEach(file => {


            // skip if file extension is out of target
            if (this.FU.isExcludedFile(file)) {
                return;
            }


            // Get the file path
            let filePath = this.FU.getFilePath(targetDir, file);
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
        let contents = fs.readFileSync(filePath, this.FU.encoding);
        let lines = contents.split(CU.LINE_BREAK);
        let lineNumber = 1;
        lines.forEach(line => {
            if (this.isContainSearchWord(line)) {
                let contentText = CU.getContent(filePath, lineNumber.toString(), line);
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
        patternStartPos += REGEXP_FORMAT_PREFIX.length;


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




    private insertText(content: string) {
        if (isNull(this.editBuilder)) {
            return;
        }
        let lineBreakText = content + CU.LINE_BREAK;
        this.editBuilder.insert(this.position(), lineBreakText);
    }


    private getPosition() {
        var line = 0;
        return () => {
            return new vscode.Position(line++, 0);
        };
    }
}

