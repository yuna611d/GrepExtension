import * as vscode from 'vscode';
import * as fs from 'fs';
import { ContentUtil } from './Utilities/ContentUtil';
import { FileUtil } from './Utilities/FileUtil';
import { Configuration } from './Configuration';
import {
    isNull
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
    private get regExp(): RegExp {

        if (isNull(this._regExp)) {
            if (this._wordFindConfig.isRegExpMode && this._wordFindConfig.regExpOptions.length > 0) {
                return this._regExp = new RegExp(this._wordFindConfig.searchWord, this._wordFindConfig.regExpOptions);
            } else {
                return this._regExp = new RegExp(this._wordFindConfig.searchWord);
            }
        } else {
            return this._regExp;
        }
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
        const isContainSearchWord = this.isContainSearchWord.bind(undefined, this.regExp);

        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            if (isContainSearchWord(foundWordInfo.lineText)) {
                const contentText = util.ContentUtil.getContent(filePath, foundWordInfo.lineNumber.toString(), foundWordInfo.lineText);
                await util.FileUtil.insertText(editor, contentText);     
            }   
        };

        const content = fs.readFileSync(filePath, this._util.FileUtil.encoding);
        await this.findWord(content, action);
    }

    public async findWordsWithRange(editor: vscode.TextEditor): Promise<Array<vscode.Range>> {
        let ranges = new Array();
        const getFindWordRange = this.getFindWordRange.bind(undefined, this.regExp);

        const action = async function(foundWordInfo: {lineText: string; lineNumber: number;}) {
            const lineNumber = (foundWordInfo.lineNumber - 1);
            const range = await getFindWordRange(foundWordInfo.lineText, lineNumber);
            if (!isNull(range)) {
                ranges.push(range);
            }
        };

        const content = editor.document.getText();
        await this.findWord(content, action);

        return ranges;
    }


    protected async findWord (content: string, action: Function) {
        const lines = content.split(this._conf.LINE_BREAK);
        for (let i = 0; i < lines.length; i++) {
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
    protected getFindWordRange (re: RegExp, targetString: string, lineNumber: number): vscode.Range | null {
        const result = re.exec(targetString);
        if (isNull(result)) {
            return null;
        }

        const startPosition = new vscode.Position(lineNumber, result.index);
        const endPosition = new vscode.Position(lineNumber, (result.index + result[0].length));
        return new vscode.Range(startPosition, endPosition);
    }

}