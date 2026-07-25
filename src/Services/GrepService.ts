'use strict';
import * as vscode from 'vscode';
import { Common } from '../Commons/Common';
import { Message } from '../Commons/Message';
import { IService, AbsOptionalService } from '../Interface/IService';
import { TimeKeeper } from '../Models/TimeKeeper';
import { ResultFileModel } from '../Models/File/ResultFileModel';
import { ResultContentModelFactory } from '../ModelFactories/ResultContentModelFactory';
import { ResultContentModel } from '../Models/Content/ResultContent/ResultContentModel';
import { DecorationService } from './DecorationService';
import { SearchWordConfiguration } from '../Models/SearchWordConfiguration';
import { DirectoryWalker, NumberedFileLine } from './DirectoryWalker';
import { LineMatcher } from './LineMatcher';

export class GrepService implements IService {

    protected searchConfig = new SearchWordConfiguration();
    protected optionalService: AbsOptionalService;
    protected directoryWalker = new DirectoryWalker();
    protected resultFile: ResultFileModel;
    protected resultContent: ResultContentModel;

    // TODO TimeKeeper should be observe from outside. However, at this time, inside of service
    private timeKeeper = new TimeKeeper();

    constructor(resultFile: ResultFileModel, searchWord: string | undefined, optionalService: DecorationService) {
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

                // set params for optional service
                this.optionalService = this.prepareOptionalService(editor);


                // Grep word
                await this.grep();

            });
        });

        return this;
    }

    protected prepareOptionalService(editor: vscode.TextEditor) {
        // Decorate found word
        // Pickup positions found word in result file.
        return this.optionalService
                    .setParam(editor)
                    .setParam(this.resultFile.FullPath)
                    ;
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
            await this.directoryWalker.walk(Common.BASE_DIR, [this.resultFile.FileNameWithExtension], r => this.findWordInAFile(r));
            // Notify finish
            vscode.window.showInformationMessage(Message.MESSAGE_FINISH);
        } catch (e) {
            console.debug(e);
            // Notify cancellation
            vscode.window.showInformationMessage(Message.MESSAGE_CANCEL);
        } finally {
            // Close any wrapping structure the format needs (no-op for txt/csv/tsv).
            await this.resultContent.addFooter();
        }

    }

    protected async findWordInAFile(r: NumberedFileLine[]) {
        const content = r.filter(v => LineMatcher.isContainSearchWord(this.searchConfig.getRegExp(), v.lineText));
        for (const v of content) {
            await this.resultContent.addLine(v.filePath, v.lineNumber.toString(), v.lineText)
            .then(async () => this.optionalService
                .setParam(await this.findWordsWithRange())
                .doService())
            .then(() => this.timeKeeper.throwErrorIfCancelled());
        }
    }

    public async findWordsWithRange(): Promise<Array<vscode.Range>> {
        const ranges: vscode.Range[] = [];

        const lines = LineMatcher.splitIntoNumberedLines(this.resultFile.getText(), this.resultContent.lineNumberOfContentStart);
        for (const foundWordInfo of lines) {
            const extracted = this.resultContent.extractContentAndOffset(foundWordInfo.lineText);
            if (extracted === null) {
                continue;
            }

            const lineNumber = (foundWordInfo.lineNumber - 1);
            const range = this.getFindWordRange(this.searchConfig.getRegExp(true), extracted.text, lineNumber, extracted.offset);
            if (range !== null) {
                ranges.push(range);
            }
        }

        return ranges;
    }


    /**
     * Return Range object if search word is found in targetString in a specified line.
     * The null is returned if search word is not found.
     */
    protected getFindWordRange (re: RegExp, targetString: string, lineNumber: number, searchStartPos: number): vscode.Range | null {
        re.lastIndex = 0;
        const result = re.exec(targetString);
        if (result === null) {
            return null;
        }

        const startIndex = searchStartPos + result.index;
        const endIndex = startIndex + result[0].length;

        const startPosition = new vscode.Position(lineNumber, startIndex);
        const endPosition = new vscode.Position(lineNumber, endIndex);
        return new vscode.Range(startPosition, endPosition);
    }

}
