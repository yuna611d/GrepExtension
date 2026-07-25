'use strict';
import * as vscode from 'vscode';
import { Common } from '../Commons/Common';
import { Message } from '../Commons/Message';
import { IService, AbsOptionalService } from '../Interface/IService';
import { TimeKeeper, CancellationError } from '../Models/TimeKeeper';
import { ResultFileModel } from '../Models/File/ResultFileModel';
import { ResultContentModelFactory } from '../ModelFactories/ResultContentModelFactory';
import { ResultContentModel } from '../Models/Content/ResultContent/ResultContentModel';
import { DecorationService } from './DecorationService';
import { SearchWordConfiguration } from '../Models/SearchWordConfiguration';
import { DirectoryWalker, NumberedFileLine } from './DirectoryWalker';
import { LineMatcher } from './LineMatcher';

export class GrepService implements IService {

    // Matches are buffered and flushed together instead of one editor.edit()/setDecorations()
    // call per matched line. Each of those calls is a round-trip to VS Code's main/renderer
    // process, so doing one per line makes grepping progress hostage to whatever else the UI
    // thread is busy with (typing, clicking, scrolling, ...) - operating VS Code while a grep
    // is running could stall the whole search until the UI went idle again. Batching cuts the
    // number of round-trips by ~BATCH_SIZE and also avoids doing the write in lock-step with
    // the UI thread.
    protected static readonly BATCH_SIZE = 40;
    protected pendingMatches: NumberedFileLine[] = [];
    protected allRanges: vscode.Range[] = [];

    protected searchConfig = new SearchWordConfiguration();
    protected optionalService: AbsOptionalService;
    protected directoryWalker = new DirectoryWalker();
    protected resultFile: ResultFileModel;
    protected resultContent: ResultContentModel;

    private timeKeeper: TimeKeeper;

    constructor(
        resultFile: ResultFileModel,
        searchWord: string | undefined,
        optionalService: DecorationService,
        timeKeeper: TimeKeeper = new TimeKeeper()
    ) {
        // Check search word existence and reg exp mode
        this.searchConfig.configure(searchWord);
        this.resultFile = resultFile;
        this.resultContent = new ResultContentModelFactory(resultFile).retrieve();

        // Optional Service
        this.optionalService = optionalService;
        this.timeKeeper = timeKeeper;
    }

    public async doService(): Promise<IService> {
        // Create and Get file path where result is outputted.
        const filePath = this.resultFile.addNewFile().FullPath;

        if (!this.prepareGrep()) { return this; }

        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);

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

        return this;
    }

    protected prepareOptionalService(editor: vscode.TextEditor) {
        // Decorate found word
        return this.optionalService.setEditor(editor);
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
            await this.directoryWalker.walk(Common.BASE_DIR, [this.resultFile.FullPath], r => this.findWordInAFile(r));
            // Flush whatever is left in the buffer (fewer than BATCH_SIZE matches).
            await this.flushPendingMatches();
            // Notify finish
            vscode.window.showInformationMessage(Message.MESSAGE_FINISH);
        } catch (e) {
            if (e instanceof CancellationError) {
                // Notify cancellation
                vscode.window.showInformationMessage(Message.MESSAGE_CANCEL);
            } else {
                // A genuine failure, not a user-initiated cancellation - don't misreport it as one.
                console.error(e);
                vscode.window.showErrorMessage(Message.MESSAGE_ERROR);
            }
        } finally {
            // Close any wrapping structure the format needs (no-op for txt/csv/tsv).
            await this.resultContent.addFooter();
        }

    }

    protected async findWordInAFile(r: NumberedFileLine[]) {
        const content = r.filter(v => LineMatcher.isContainSearchWord(this.searchConfig.getRegExp(), v.lineText));
        this.pendingMatches.push(...content);

        if (this.pendingMatches.length >= GrepService.BATCH_SIZE) {
            await this.flushPendingMatches();
        }
    }

    /**
     * Write every buffered match with a single editor edit, update decorations once for the
     * whole batch, then check for cancellation. Called every BATCH_SIZE matches and once more
     * after the walk finishes to flush the remainder.
     */
    protected async flushPendingMatches() {
        if (this.pendingMatches.length === 0) {
            return;
        }

        const batch = this.pendingMatches;
        this.pendingMatches = [];

        const entries = batch.map(v => ({ filePath: v.filePath, lineNumber: v.lineNumber.toString(), line: v.lineText }));
        const results = await this.resultContent.addLines(entries);

        const regExp = this.searchConfig.getRegExp(true);
        for (const { documentLineNumber, extracted } of results) {
            if (extracted === null) {
                continue;
            }
            const range = this.getFindWordRange(regExp, extracted.text, documentLineNumber, extracted.offset);
            if (range !== null) {
                this.allRanges.push(range);
            }
        }

        this.optionalService.setRanges(this.allRanges).doService();

        this.timeKeeper.throwErrorIfCancelled();
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
