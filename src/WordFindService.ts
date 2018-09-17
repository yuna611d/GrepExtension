import * as vscode from 'vscode';
import * as fs from 'fs';
import { ContentUtil } from './Utilities/ContentUtil';
import { FileUtil } from './Utilities/FileUtil';
import { Configuration } from './Configuration';
import {
    isNull, isNullOrUndefined
} from 'util';

export class WordFindService {
    private _conf: Configuration;
    private _util: {FileUtil: FileUtil; ContentUtil: ContentUtil; };
    private _wordFindConfig: {
        searchWord: string;
        isRegExpMode: boolean;
        regExpOptions: string;
    };

    private _regExp: RegExp | null = null;
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

    constructor(conf: Configuration, 
                util: {FileUtil: FileUtil; ContentUtil: ContentUtil; }, 
                wordFindConfig: {
                    searchWord: string;
                    isRegExpMode: boolean;
                    regExpOptions: string;
                }) {
        // Set injections
        this._conf = conf;
        this._util = util;
        this._wordFindConfig = wordFindConfig;
    }

    /**
     * Read file and insert text to activeeditor.
     * @param filePath filePath
     */
    public async readFileAndInsertText(editor: vscode.TextEditor, filePath: string) {
        const util = this._util;
        const isContainSearchWord = this.isContainSearchWord.bind(undefined, this.getRegExp());

        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            if (isContainSearchWord(foundWordInfo.lineText)) {
                const contentText = util.ContentUtil.getContent(filePath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
                await util.FileUtil.insertText(editor, contentText);     
            }   
        };

        const buff = fs.readFileSync(filePath, null);
        if (this.seemsBinary(buff)) {
            return;
        }

        const content = buff.toString(this._util.FileUtil.encoding);
        await this.findWord(content, action);
    }

    public async findWordsWithRange(editor: vscode.TextEditor, startLine: number): Promise<Array<vscode.Range>> {
        let ranges = new Array();

        const contentIndex = this._util.ContentUtil.columnInfo.content;
        const contentSeparator = this._util.ContentUtil.SEPARATOR;
        const getFindWordRange = this.getFindWordRange.bind(undefined, this.getRegExp(true));

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


    protected async findWord (content: string, action: Function, startLine?: number) {
        const start = (isNullOrUndefined(startLine)) ? 0 : startLine;
        const lines = content.split(this._conf.LINE_BREAK);
        for (let i = start; i < lines.length; i++) {
            let line = lines[i];
            let lineNumber = i + 1;
            let foundWordInfo = {lineText: line, lineNumber: lineNumber};

            // Do passed action.
            await action(foundWordInfo);

        }
    }


    /**
     * Check if line contains search word or not.
     * @param targetString 
     */
    protected isContainSearchWord(re: RegExp, targetString: string): boolean {
        return re.test(targetString);
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
     * Check if passed file is binary or not.
     * This is a cheap implementation to determine if passed file is binary or not.
     * This function determine passed file as binary if file contains code under the ascii 08.
     * @param bufer
     */
    public seemsBinary(buffer: Buffer): boolean {
        const controls = [0,1,2,3,4,5,6,7,8];
        for (let i = 0; i < 512; i++) {
            const c = buffer[i];
            if (controls.indexOf(c) > -1) {
                return true;
            }
        }
        return false;
    }

}