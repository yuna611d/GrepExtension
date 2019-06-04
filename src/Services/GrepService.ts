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
import { Message } from '../Commons/Message';
import { DecorationService } from './DecorationService';
import { IService } from '../Interface/IService';

export class GrepService implements IService {

    private resultFile: ResultFileModel;
    private resultContent: ResultContentModel;
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();
    private searchConfig = new SearchWordConfiguration();
    private optionalService: DecorationService | undefined;

    // TODO TimeKeeper should be observe from outside. However, at this time, inside of service
    private timeKeeper = new TimeKeeper();

    constructor(resultFile: ResultFileModel, searchWord: string | undefined, optionalService?: DecorationService) {
        // Check search word existence and reg exp mode
        this.searchConfig.configure(searchWord);
        this.resultFile = resultFile;
        this.resultContent = new ResultContentModelFactory(resultFile).retrieve();

        // Optional Service
        this.optionalService = optionalService;
    }

    public doService() {
        // Create and Get file path where result is outputted.
        const filePath = this.resultFile.addNewFile();
        if (this.prepareGrep()) {
            vscode.workspace.openTextDocument(filePath).then(doc => {
                vscode.window.showTextDocument(doc).then(async editor => {
                    // Grep word
                    const ranges = await this.grep(editor);

                    // Decorate found word     
                    if (!isNullOrUndefined(this.optionalService)) {               
                        await this.optionalService
                                .setParam(editor)
                                .setParam(filePath)
                                .setParam(ranges)                   
                                .doService();
                    }
                });
            });    
        }                
    }

    protected prepareGrep(): boolean {
        if (!this.searchConfig.hasValidSearchWord()) {
            vscode.window.showInformationMessage(Message.MESSAGE_FAILED);
            return false;
        }
        
        // Start time consuming count
        this.timeKeeper.countStart();

        // set Configuration
        this.resultContent.setGrepConditionText(Common.BASE_DIR, 
                {searchWord: this.searchConfig.SearchWord, 
                 isRegExpMode: this.searchConfig.IsRegExpMode});
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
            vscode.window.showInformationMessage(Message.MESSAGE_FINISH);    
        } catch (e) {
             // Notify cancellation
            vscode.window.showInformationMessage(Message.MESSAGE_CANCEL);
        }
        
        // Pickup positions found word in result file.
        return await this.findWordsWithRange(editor, columnTitleLineNumber);
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
        let targetDir = this.getTargetDir(nextTargetDir);
        if (isNull(targetDir)) {
            return;
        }

        // Get file or directory names in targetDir
        const targetFiles = this.getTargetFiles(targetDir);

        for (let file of targetFiles) {
            if (file.isDirectory) {
                // if file path is directory, re-grep by using file path as nextTargetDir
                await this.directorySeekAndInsertText(editor, file.FullPath);
            } else if (file.isFile) {
                // if file path is file, read file and insert grep results to editor
                await this.readFileAndInsertText(editor, file);
            }

            // End performance measure
            this.timeKeeper.checkConsumedTime();
        }

    }

    /**
     * Read file and insert text to active editor.
     * @param filePath filePath
     */
    public async readFileAndInsertText(editor: vscode.TextEditor, seekedFile: SeekedFileModel) {
        const isContainSearchWord = this.isContainSearchWord.bind(undefined, this.getRegExp());

        // Action when search word is found
        const resultContent = this.resultContent;        
        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            if (isContainSearchWord(foundWordInfo.lineText)) {
                // const foundResult = content.getContentInOneLine(seekedFile.FilePath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
                await resultContent.addLine(seekedFile.FullPath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
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
     * The null is returned if search word is not found.
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

    protected getTargetDir(nextTargetDir: string | null) {
        return (isNull(nextTargetDir)) ? Common.BASE_DIR : nextTargetDir;
    }

    protected getTargetFiles(targetDir: string) {
        // Skip if file name is ignored file or directory
        const targetFiles = fs.readdirSync(targetDir)
        .map(file => {
            return this.seekedFileModelFactory.retrieve(file, targetDir, this.resultFile);
        }).filter(file => {
            return !file.isIgnoredFileOrDirectory();
        });
        return targetFiles;
    }

    private getRegExp(isGlobal?: boolean): RegExp {

        if (isGlobal) {
            return this._regExp = new RegExp(this.searchConfig.SearchWord, this.searchConfig.RegExpOptions + 'g');
        }

        if (isNull(this._regExp)) {
            if (this.searchConfig.IsRegExpMode) {
                return this._regExp = new RegExp(this.searchConfig.SearchWord, this.searchConfig.RegExpOptions);
            } else {
                this.searchConfig.addIgnoreCaseOption();
                return this._regExp = new RegExp(this.searchConfig.SearchWord, this.searchConfig.RegExpOptions);
            }
        } 

        return this._regExp;
    }
    private _regExp: RegExp | null = null;

}

class SearchWordConfiguration {

    public get SearchWord() {return this.searchWord;}
    public get IsRegExpMode() {return this.isRegExpMode;}
    public get RegExpOptions() {return this.regExpOptions;}

    private searchWord = '';
    private isRegExpMode = false;
    private regExpOptions =  '';

    resetConfiguration() {
        this.searchWord = '';
        this.isRegExpMode = false;
        this.regExpOptions =  '';    
    }

    setInitialConfiguration(searchWord: string) {
        this.resetConfiguration();
        this.searchWord = searchWord;
    }

    setRegExpMode(pattern: string, options: string) {
        this.searchWord = pattern;
        this.isRegExpMode = true;
        this.regExpOptions = options;
    }

    addIgnoreCaseOption() {
        this.regExpOptions += (this.regExpOptions.indexOf('i') === -1) ? 'i': '';
    }

    hasValidSearchWord(): boolean {
        if (isNullOrUndefined(this.SearchWord) || this.SearchWord.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Set parameters for regular expression.
     * @param searchWord: searchWord
     */
    public configure(searchWord: string | null | undefined) {
        // Guard
        if (isNullOrUndefined(searchWord)) {
            return;
        }

        // Set Initial  Configuration
        this.setInitialConfiguration(this._escapeRegExpWord(searchWord));

        // re/<pattern>/<flags> -> [<pattern>, <flagCandidates>]
        const splittedWords = this._getPatternAndFlagCandidates(searchWord);        
        // Get Pattern, which may be option of regexp
        const pattern = splittedWords[0];
        if (!pattern) {
            return;
        }
        // Get Flags from input word
        const options = this._getFlags(splittedWords[1]);

        // Configure for regexp
        this.setRegExpMode(pattern, options);
    }

    private _getPatternAndFlagCandidates(searchWord: string): Array<string | null>{    

        // StartPos
        const startPos = this._getPatternStartPos(searchWord);
        if (!startPos) {
            return [null, null];
        }
        // EndPos
        const endPos = this._getPatternEndPos(searchWord, startPos);
        if (!endPos){
            return [null, null];
        }

        // Return pattern and flagCandidates
        const pattern = this._getPattern(searchWord, startPos, endPos);
        const flags = this._getFlagCandidates(searchWord, endPos);
        return [pattern, flags];
    }

    private _getFlags(flagCandidates: string | null): string {
        const ALLOWED_OPTIONS = ["i"];

        return (flagCandidates || "").split("")
            .filter(c => { return ALLOWED_OPTIONS.indexOf(c) > -1; })
            .reduce((option, candidate) => {return option += candidate;}, "");
    }

    private _getPatternStartPos(searchWord: string): number | null {
        const REGEXP_FORMAT_PREFIX = "re/"; 
        const startPos = searchWord.indexOf(REGEXP_FORMAT_PREFIX);
        if (startPos === -1) {
            return null;
        }
        return startPos + REGEXP_FORMAT_PREFIX.length;
    }
    private _getPatternEndPos(searchWord: string, startPos: number): number | null{
        const REGEXP_FORMAT_POSTFIX = "/";
        const endPos = searchWord.lastIndexOf(REGEXP_FORMAT_POSTFIX);
        if (endPos === -1 || startPos >= endPos) {
            return null;
        }
        return endPos;
    }

    private _getPattern(searchWord: string, startPos: number, endPos: number): string | null{    
        const pattern = searchWord.substring(startPos, endPos);
        if (pattern.length === 0) {
            return null;
        }
        return pattern;
    }

    private _getFlagCandidates(searchWord: string, startPos: number): string | null{    
        const flags = searchWord.substring(startPos+ 1);
        if (flags.length === 0) {
            return null;
        }
        return flags;
    }

    private _escapeRegExpWord(word: string): string {
        return word.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }

}