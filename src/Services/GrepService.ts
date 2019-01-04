'use strict';
import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';
import * as fs from 'fs';
import { TimeKeeper } from '../Models/TimeKeeper';
import { ResultFileModel } from '../Models/ResultFileModel';
import { ResultContentModel } from '../Models/ResultContentModel';
import { Common } from '../Commons/Common';
import { SeekedFileModel } from '../Models/SeekedFileModel';
import { ResultContentModelFactory } from '../ModelFactories/ResultContentModelFactory';
import { FileModelFactory } from '../ModelFactories/FileModelFactory';

export class GrepService {

    private resultFile: ResultFileModel;
    private resultContent: ResultContentModel;
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();
    private _wordFindConfig = {
        searchWord: '',
        isRegExpMode: false,
        regExpOptions: ''
    };
    // TODO TimeKeepr should be observe from outside. However, at this time, inside of service
    private timeKeeper = new TimeKeeper();

    constructor(resultFile: ResultFileModel, searchWord: string | undefined) {
        // Check search word exisntance and reg exp mode
        if (!isNullOrUndefined(searchWord)) {
            this.setSearchWordConfig(searchWord);
        }
        this.resultFile = resultFile;
        this.resultContent = new ResultContentModelFactory(resultFile).retrieve();
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
        this.resultContent.setGrepConf(Common.BASE_DIR, this._wordFindConfig);
        return true;
    }

    public async grep(editor: vscode.TextEditor): Promise<Array<vscode.Range>> {        
        // Set editor to resultFile
        this.resultFile.editor = editor;

        // Write Title
        await this.resultContent.addTitle();
        // Write Column Title
        const columnTitleLineNumber = await this.resultContent.addColumnTitle();
        // Do grep and write its found result.
        try {
            await this.directorySeekAndInsertText(editor);
            // Notify finish
            vscode.window.showInformationMessage("Grep is finished...");    
        } catch (e) {
             // Notify cancellation
            vscode.window.showInformationMessage('Grep is cancelled');
        }
        
        // Pickup positions found word in result file.
        return await this.findWordsWithRange(editor, columnTitleLineNumber);
    }


    //----- Core functions -----

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
        let targetDir = this.getTargetDir(nextTargetDir);
        if (isNull(targetDir)) {
            return;
        }

        // Get file or directory names in targetDir
        const files = fs.readdirSync(targetDir);

        for (let file of files) {

            const seekdFile = this.seekedFileModelFactory.retrieve(file, targetDir, this.resultFile);

            // Skip if file name is ignored file or directory
            if (seekdFile.isIgnoredFileOrDirectory()) {
                continue;
            }

            if (seekdFile.isDirectory) {
                // if file path is directory, regrep by using filepath as nextTargetDir
                await this.directorySeekAndInsertText(editor, seekdFile.FilePath);
            } else if (seekdFile.isFile) {
                // if file path is file, read file and insert grep results to editor
                await this.readFileAndInsertText(editor, seekdFile);
            }

            // End performance measure
            this.timeKeeper.checkConsumedTime();
        }
    }

    /**
     * Read file and insert text to activeeditor.
     * @param filePath filePath
     */
    public async readFileAndInsertText(editor: vscode.TextEditor, seekedFile: SeekedFileModel) {
        const isContainSearchWord = this.isContainSearchWord.bind(undefined, this.getRegExp());

        // Action when search word is found
        const resultContent = this.resultContent;        
        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            if (isContainSearchWord(foundWordInfo.lineText)) {
                // const foundResult = content.getContentInOneLine(seekedFile.FilePath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
                await resultContent.addLine(seekedFile.FilePath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
            }   
        };

        if (seekedFile.seemsBinary) {
            return;
        }

        await this.findWord(seekedFile.Content, action);
    }



    protected async findWord (content: string, action: Function, startLine?: number) {
        const start = (isNullOrUndefined(startLine)) ? 0 : startLine;
        const lines = content.split(Common.LINE_BREAK);
        for (let i = start; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + 1;
            let foundWordInfo = {lineText: line, lineNumber: lineNumber};

            // Do passed action.
            await action(foundWordInfo);

        }
    }

    public async findWordsWithRange(editor: vscode.TextEditor, startLine: number): Promise<Array<vscode.Range>> {
        let ranges = new Array();

        const contentIndex = this.resultContent.columnPosition.content;
        const contentSeparator = this.resultContent.SEPARATOR;
        const getFindWordRange = this.getFindWordRange.bind(undefined, this.getRegExp(true));

        // Action when search word is found
        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            const lineText = foundWordInfo.lineText;
            const splittedTexts = lineText.split(contentSeparator);
            const contentText = (splittedTexts.length >= contentIndex) ? splittedTexts[contentIndex] : "";
            const searchStartPos = splittedTexts.map(x => x.length).reduce((a, v, i) => (i < contentIndex) ? a + v + contentSeparator.length : a) + contentSeparator.length;

            const lineNumber = (foundWordInfo.lineNumber - 1);
            const range = await getFindWordRange(contentText, lineNumber, searchStartPos);
            if (!isNull(range)) {
                ranges.push(range);
            }
        };

        const content = editor.document.getText();
        await this.findWord(content, action, startLine);

        return ranges;
    }


    /**
     * Return Range object if search word is found in targetString in a specified line.
     * The null is retruned if search word is not found.
     */
    protected getFindWordRange (re: RegExp, targetString: string, lineNumber: number, searchStartPos: number): vscode.Range | null {
        re.lastIndex = 0;
        let result = re.exec(targetString);
        if (isNull(result)) {
            return null;
        }

        let startIndex = searchStartPos + result.index;
        let endIndex = startIndex + result[0].length;

        const startPosition = new vscode.Position(lineNumber, startIndex);
        const endPosition = new vscode.Position(lineNumber, endIndex);
        return new vscode.Range(startPosition, endPosition);
    }

    /**
     * Check if line contains search word or not.
     * @param targetString 
     */
    protected isContainSearchWord(re: RegExp, targetString: string): boolean {
        return re.test(targetString);
    }

    //----- Core functions -----




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


    protected getTargetDir(nextTargetDir: string | null) {
        return (isNull(nextTargetDir)) ? Common.BASE_DIR : nextTargetDir;
    }

    private getRegExp(isGlobal?: boolean): RegExp {

        if (isGlobal) {
            return this._regExp = new RegExp(this._wordFindConfig.searchWord, this._wordFindConfig.regExpOptions + 'g');
        }

        if (isNull(this._regExp)) {
            if (this._wordFindConfig.isRegExpMode) {
                return this._regExp = new RegExp(this._wordFindConfig.searchWord, this._wordFindConfig.regExpOptions);
            } else {
                this._wordFindConfig.regExpOptions += (this._wordFindConfig.regExpOptions.indexOf('i') === -1) ? 'i': '';
                return this._regExp = new RegExp(this._wordFindConfig.searchWord, this._wordFindConfig.regExpOptions);
            }
        } 


        return this._regExp;
    }
    private _regExp: RegExp | null = null;



}