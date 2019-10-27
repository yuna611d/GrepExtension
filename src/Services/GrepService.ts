'use strict';
import * as vscode from 'vscode';
import { isNullOrUndefined, isNull } from 'util';
import { Common } from '../Commons/Common';
import { Message } from '../Commons/Message';
import { IService } from '../Interface/IService';
import { TimeKeeper } from '../Models/TimeKeeper';
import { ResultFileModel } from '../Models/File/ResultFileModel';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';
import { ResultContentModelFactory } from '../ModelFactories/ResultContentModelFactory';
import { DecorationService } from './DecorationService';
import { SearchWordConfiguration } from '../Models/SearchWordConfiguration';
import { ResultContentModel } from '../Models/Content/ResultContent/ResultContentModel';
import { FileRepository } from '../Models/File/FileRepository';

export class GrepService implements IService {

    private resultFile: ResultFileModel;
    private resultContent: ResultContentModel;
    private searchConfig = new SearchWordConfiguration();
    private optionalService: DecorationService | undefined;
    protected fileRepository: FileRepository = new FileRepository();

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

    public doService(): IService {
        // Create and Get file path where result is outputted.
        const filePath = this.resultFile.addNewFile().FullPath;

        if (!this.prepareGrep()) { return this; }

        vscode.workspace.openTextDocument(filePath).then(doc => {
            vscode.window.showTextDocument(doc).then(async editor => {
                // Set editor to resultFile
                this.resultFile.initialize(editor);
                // Write Title
                await this.resultContent.addTitle();
                // Write Column Title
                await this.resultContent.addColumnTitle();

                // Grep word
                await this.grep();

                // Do optional service
                await this.doOptionalService(editor);
            });
        });

        return this;                         
    }

    protected async doOptionalService(editor: vscode.TextEditor) {
        if (isNullOrUndefined(this.optionalService)) { return false; }     

        // Decorate found word     
        // Pickup positions found word in result file.
        const ranges = await this.findWordsWithRange();       
        return this.optionalService.setParam(editor).setParam(this.resultFile.FullPath).setParam(ranges).doService();   
    }

    protected prepareGrep(): boolean {
        if (!this.searchConfig.hasValidSearchWord()) {
            vscode.window.showInformationMessage(Message.MESSAGE_FAILED);
            return false;
        }
        
        // set Configuration
        this.resultContent.setGrepConditionText(Common.BASE_DIR, 
                {searchWord: this.searchConfig.SearchWord, 
                 isRegExpMode: this.searchConfig.IsRegExpMode});
        return true;
    }

    public async grep() {        

        // Do grep and write its found result.
        try {
            await this.seekDirectoryOrInsertText();
            // Notify finish
            vscode.window.showInformationMessage(Message.MESSAGE_FINISH);    
        } catch (e) {
             // Notify cancellation
            vscode.window.showInformationMessage(Message.MESSAGE_CANCEL);
        }
        
    }

    /**
     * Read file and check if line contain search word or not.
     * @param nextTargetDir directory where is next target.
     */
    protected async seekDirectoryOrInsertText(nextTargetDir: string | null = null) {        
        // Get target directory
        let targetDir = this.getTargetDir(nextTargetDir);
        if (isNull(targetDir)) {
            return;
        }

        const seekedFilesOrDirectories = this.fileRepository.retrieve(targetDir, [this.resultFile.FileNameWithExtension]);
        // if file path is directory, re-grep by using file path as nextTargetDir
        const directories = seekedFilesOrDirectories.filter(target => target.isDirectory);
        for (const target of directories) { 
            await this.seekDirectoryOrInsertText(target.FullPath);
        }

        // if file path is file, read file and insert grep results to editor
        const files = seekedFilesOrDirectories.filter(f => f.isFile).filter(f => !f.seemsBinary);
        for (const f of files) {
            await this.readContent(f).then(async r => await this.findWordInAFile(r));   
        }
    }


    async findWordInAFile(r: {filePath:string, lineText: string, lineNumber: number}[]) {
        const content = r.filter(v => this.isContainSearchWord(this.getRegExp(), v.lineText));
        for (const v of content) {
            await this.resultContent.addLine(v.filePath, v.lineNumber.toString(), v.lineText)
            .then(r => this.timeKeeper.throwErrorIfCancelled()); 
        }
    }

    
    protected async readContent (file: SeekedFileModel, startLine?: number) {
        const start = (isNullOrUndefined(startLine)) ? 0 : startLine;
        const lines = file.Content.split(Common.LINE_BREAK);
        const counter = (s: number) => {var i=s; return ()=>{return ++i;}; };
        const lineCounter = counter(start);
        return  lines.slice(start)
                     .map(line => { 
                         return {
                             filePath: file.FullPath,
                             lineText: line, 
                             lineNumber: lineCounter()};
                    });
    }
    
    protected async findWord (content: string, action: Function, startLine?: number) {
        const start = (isNullOrUndefined(startLine)) ? 0 : startLine;
        const lines = content.split(Common.LINE_BREAK);
        const counter = (s: number) => {var i=s; return ()=>{return ++i;}; };
        const lineCounter = counter(start);
        const foundWordInfo = lines.slice(start)
                                    .map(line => { return {lineText: line, lineNumber: lineCounter()};});
        for (const v of foundWordInfo) { await action(v); }

    }


    public async findWordsWithRange(): Promise<Array<vscode.Range>> {
        let ranges = new Array();

        // Action when search word is found
        const action = async (foundWordInfo: {lineText: string; lineNumber: number;}) => {
            const splittedTexts = foundWordInfo.lineText.split(this.resultContent.SEPARATOR);
            const contentText = (splittedTexts.length >= this.resultContent.columnPosition.content) ? splittedTexts[this.resultContent.columnPosition.content] : "";
            const searchStartPos = splittedTexts.map(x => x.length)
                                                .reduce((a, v, i) => (i < this.resultContent.columnPosition.content) ? a + v + this.resultContent.SEPARATOR.length : a) + this.resultContent.SEPARATOR.length;

            const lineNumber = (foundWordInfo.lineNumber - 1);
            const range = this.getFindWordRange(this.getRegExp(true), contentText, lineNumber, searchStartPos);
            if (!isNull(range)) {
                ranges.push(range);
            }
        };


        await this.findWord(this.resultFile.getText(), action, this.resultContent.lineNumberOfContentStart);
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