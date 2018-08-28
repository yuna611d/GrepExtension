'use strict';
import {
    Configuration
} from './Configuration';
import * as ib from './InputBox';
import * as cu from './ContentUtil';
import * as fu from './FileUtil';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';


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
        let searchWord = v;
        let conf = new Configuration();
        let cfFactory = new cu.ContentUtilFactory(conf);
        let ffFactory = new fu.FileUtilFactory(conf);
        let service = new GrepService(searchWord, conf, ffFactory.retrieve(), cfFactory.retrieve());
        service.serve();

        return () => {};
    }
}


export class GrepService {
    private _conf: Configuration;
    private _fu: fu.FileUtil;
    private _cu: cu.ContentUtil;

    protected searchWord = "";


    protected isRegExpMode = false;
    protected regExpOptions = "";

    constructor(searchWord: string | undefined, conf: Configuration, fu: fu.FileUtil, cu: cu.ContentUtil) {
        // Set injections
        this._conf = conf;
        this._fu = fu;
        this._cu = cu;

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
        this._fu.addNewFile();

        // Open result file (fire onDidOpenTextDocument Event)
        vscode.workspace.openTextDocument(this._fu.resultFilePath).then(doc => {
            vscode.window.showTextDocument(doc).then(async editor => {

                // set Configuration
                this._cu.setGrepConf(this._fu.baseDir, this.searchWord, this.isRegExpMode);

                // Write Title
                await this._fu.insertText(editor, this._cu.getTitle());
                // Write Content Title
                await this._fu.insertText(editor, this._cu.getContentTitle());
                // Do grep and output its results.
                await this.directorySeekAndInsertText(editor);
                // Notify finish
                vscode.window.showInformationMessage("Grep is finished...");
            });
        });
    }



    /**
     * Read file and check if line contain search word or not.
     * @param nextTargetDir directory where is next target.
     */
    protected async directorySeekAndInsertText(editor: vscode.TextEditor, nextTargetDir: string | null = null) {
        // Get target directory
        let targetDir = this._fu.getTargetDir(nextTargetDir);
        if (isNull(targetDir)) {
            return;
        }

        // Get file or directory names in targetDir
        let files = fs.readdirSync(targetDir);

        for (let file of files) {

            // Skip if file name is ignored file or directory
            if (this.isIgnoredFileOrDirectory(file)) {
                continue;
            }

            // Get the file path
            let filePath = this._fu.getFilePath(targetDir, file);
            // Check if the file path is file or directory
            let stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // if file path is directory, regrep by using filepath as nextTargetDir
                this.directorySeekAndInsertText(editor, filePath);
            } else if (stat.isFile()) {
                // if file path is file, read file and insert grep results to editor
                await this.readFileAndInsertText(editor, filePath);
            }
        }

    }

    /**
     * Read file and insert text to activeeditor.
     * @param filePath filePath
     */
    protected async readFileAndInsertText(editor: vscode.TextEditor, filePath: string) {
        let contents = fs.readFileSync(filePath, this._fu.encoding);
        let lines = contents.split(this._conf.LINE_BREAK);
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + 1;
            if (this.isContainSearchWord(line)) {
                let contentText = this._cu.getContent(filePath, lineNumber.toString(), line);
                await this._fu.insertText(editor, contentText);
            }
        }
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


    protected isIgnoredFileOrDirectory(file: string): boolean {
        // skip if file extension is out of target
        if (this._fu.isExcludedFile(file)) {
            return true;
        }
        // skip if hidden file or directory.
        if (this._conf.ignoreHiddenFile() && file.startsWith(".")) {
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


}