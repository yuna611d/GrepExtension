'use strict';
import { Configuration } from '../Configurations/Configuration';
import { ContentUtil } from '../Utilities/ContentUtil';
import { FileUtil } from '../Utilities/FileUtil';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';
import { WordFindService } from './WordFindService';
import { TimeKeeper } from '../Utilities/TimeKeeper';

export class GrepService {
    private _conf: Configuration;
    private _util: {
        FileUtil: FileUtil;ContentUtil: ContentUtil;
    };

    private _wordFindService: WordFindService;
    private _wordFindConfig = {
        searchWord: '',
        isRegExpMode: false,
        regExpOptions: ''
    };

    private timeKeeper = new TimeKeeper();

    constructor(searchWord: string | undefined, 
                conf: Configuration, 
                util: {FileUtil: FileUtil;ContentUtil: ContentUtil;}) {
        // Set injections
        this._conf = conf;
        this._util = util;

        // Check search word exisntance and reg exp mode
        if (!isNullOrUndefined(searchWord)) {
            this.setSearchWordConfig(searchWord);
        }

        this._wordFindService = new WordFindService(conf, util, this._wordFindConfig);

    }

    private isValidSearchWord(): boolean {
        // Get search word
        const searchWord = this._wordFindConfig.searchWord;
        if (isNullOrUndefined(searchWord) || searchWord.length === 0) {
            vscode.window.showInformationMessage("Sorry, I can't grep this word...");
            return false;
        }
        return true;
    }

    public prepareGrep(): boolean {
        if (!this.isValidSearchWord()) {
            return false;
        }
        // Start time consuming count
        this.timeKeeper.countStart();

        // set Configuration
        this._util.ContentUtil.setGrepConf(this._util.FileUtil.baseDir, this._wordFindConfig);
        return true;
    }

    public async grep(editor: vscode.TextEditor, resultFilePath: string): Promise<Array<vscode.Range>> {

        // Write Title
        await this._util.FileUtil.insertText(editor, this._util.ContentUtil.getTitle());
        // Write Content Title
        const contentTitleLineNumber = await this._util.FileUtil.insertText(editor, this._util.ContentUtil.getContentTitle());
        // Do grep and output its results.
        await this.directorySeekAndInsertText(editor)
            .catch((err) => vscode.window.showInformationMessage('Grep is cancelled')); // Notify cancellation
        
        // Notify finish
        vscode.window.showInformationMessage("Grep is finished...");    

        // Pickup positions found word in result file.
        return await this._wordFindService.findWordsWithRange(editor, contentTitleLineNumber);
    }



    /**
     * Read file and check if line contain search word or not.
     * @param nextTargetDir directory where is next target.
     */
    protected async directorySeekAndInsertText(editor: vscode.TextEditor, nextTargetDir: string | null = null) {
        // If cancelled, Do nothing
        if (this.timeKeeper.isConfirmationTime()) {
            throw new Error('GrepInterruptionError');
        }
        
        // Get target directory
        let targetDir = this._util.FileUtil.getTargetDir(nextTargetDir);
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
            let filePath = this._util.FileUtil.getFilePath(targetDir, file);
            // Check if the file path is file or directory
            let stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // if file path is directory, regrep by using filepath as nextTargetDir
                await this.directorySeekAndInsertText(editor, filePath);
            } else if (stat.isFile()) {
                // if file path is file, read file and insert grep results to editor
                await this._wordFindService.readFileAndInsertText(editor, filePath);
            }

            // End performance measure
            this.timeKeeper.checkConsumedTime();
        }
    }

    protected isIgnoredFileOrDirectory(file: string): boolean {
        // skip if file extension is out of target
        if (this._util.FileUtil.isExcludedFile(file)) {
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
    protected setSearchWordConfig(searchWord: string) {
        // Set Inital  Configuration
        this._wordFindConfig.searchWord = this.escapeRegExpWord(searchWord);
        this._wordFindConfig.isRegExpMode = false;
        this._wordFindConfig.regExpOptions = '';


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
        this._wordFindConfig.searchWord = pattern;
        this._wordFindConfig.isRegExpMode = true;
        this._wordFindConfig.regExpOptions = options;
    }

    private escapeRegExpWord(word: string): string {
        return word.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }

}