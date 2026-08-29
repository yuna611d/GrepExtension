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

    // setDecorations replaces every decoration of its type, so each update has to be handed the
    // whole accumulated set, not the new part of it. Doing that once per batch means the same
    // ranges are marshalled to the renderer again and again, and the total work grows with the
    // square of the number of matches: 100,000 matches were handed over 125,050,000 times across
    // 2,500 calls - 1,251 range objects marshalled per match found.
    //
    // Updating less often as the set grows makes that total linear instead. Waiting until the set
    // is DECORATION_GROWTH times the size it was when it was last shown turns the series into a
    // geometric one, so what gets handed over settles at about three times the number of matches
    // however many there are, and the number of calls grows with its logarithm.
    //
    // The floor keeps short searches - where the whole set is cheap to send - updating on every
    // batch, which is what makes highlights appear as the results are written.
    protected static readonly DECORATION_GROWTH = 1.5;
    protected decorateWhenAtLeast = 0;

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
        // Check the search word before creating anything. Creating the file first meant a search
        // that could not run still left its result file behind - an empty one, in the workspace,
        // for a search that never happened.
        if (!this.prepareGrep()) { return this; }

        // Create and Get file path where result is outputted.
        const filePath = (await this.resultFile.addNewFile()).FullPath;

        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);

        // Set editor to resultFile
        this.resultFile.initialize(editor);
        // Start from an empty document unless the format is happy to be appended to.
        if (!this.resultContent.appendsToPreviousResult) {
            await this.resultFile.clear();
        }
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
        // Decorate found word. Whatever the last search highlighted goes first: this search's
        // matches are the ones worth pointing at, and a search that finds nothing never reaches
        // a flush - so without this the previous highlights would simply stay on screen.
        this.optionalService.setEditor(editor);
        return this.optionalService.clear();
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
            await this.directoryWalker.walk(Common.BASE_DIR, this.resultFile.AllFormatFullPaths, r => this.findWordInAFile(r));
            // Flush whatever is left in the buffer (fewer than BATCH_SIZE matches).
            await this.flushPendingMatches();
            // Notify finish
            vscode.window.showInformationMessage(Message.MESSAGE_FINISH);
        } catch (e) {
            if (e instanceof CancellationError) {
                // The cancellation is raised from findWordInAFile(), which may still be holding a
                // partial batch. Write it out so a cancelled grep keeps every match it had already
                // found, instead of silently dropping up to BATCH_SIZE-1 of them.
                await this.flushPendingMatches();
                // Notify cancellation
                vscode.window.showInformationMessage(Message.MESSAGE_CANCEL);
            } else {
                // A genuine failure, not a user-initiated cancellation - don't misreport it as one.
                console.error(e);
                vscode.window.showErrorMessage(Message.MESSAGE_ERROR);
            }
        } finally {
            // Whatever the last update skipped, show now: the highlights the user is left looking
            // at should be every match, not the set as it stood at some earlier point.
            this.showDecorations();
            // Close any wrapping structure the format needs (no-op for txt/csv/tsv).
            await this.resultContent.addFooter();
            // Then write it out - after the footer, so what reaches the file is a complete
            // document, and in the finally so that a cancelled or failed grep still keeps the
            // matches it did find rather than leaving them in an unsaved editor.
            await this.persistResult();
        }

    }

    protected async persistResult(): Promise<void> {
        if (await this.resultFile.save()) {
            return;
        }
        this.showNotSavedWarning();
    }

    protected showNotSavedWarning(): void {
        vscode.window.showWarningMessage(Message.MESSAGE_NOT_SAVED);
    }

    protected async findWordInAFile(readings: NumberedFileLine[][]) {
        // One reading of the file normally, several when the search tries every encoding. The
        // first that finds anything is the one reported: a file is reported through a single
        // encoding, never as a mixture of them, and the readings are ordered so that the editor's
        // own comes before any guess. Readings that find nothing say nothing about the file.
        for (const lines of readings) {
            const found = lines.filter(v => LineMatcher.isContainSearchWord(this.searchConfig.getRegExp(), v.lineText));
            if (found.length > 0) {
                this.pendingMatches.push(...found);
                break;
            }
        }

        if (this.pendingMatches.length >= GrepService.BATCH_SIZE) {
            await this.flushPendingMatches();
        }

        // Checked once per file walked rather than once per flush. Flushing only happens when a
        // batch fills up, so a search that matches nothing - or matches rarely - used to reach
        // this check late or never: the "this is taking a while, continue?" prompt never appeared
        // and a long grep over a big tree could not be stopped at all.
        this.timeKeeper.throwErrorIfCancelled();
    }

    /**
     * Write every buffered match with a single editor edit and update decorations once for the
     * whole batch. Called every BATCH_SIZE matches, once more after the walk finishes to flush
     * the remainder, and once on cancellation. Writing only - cancellation is checked by
     * findWordInAFile() so that it happens even when no batch ever fills up.
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

        this.showDecorationsIfDue();
    }

    /**
     * Show the matches found so far, unless the set has not grown enough since it was last shown
     * to be worth sending again. See DECORATION_GROWTH.
     */
    protected showDecorationsIfDue(): void {
        if (this.allRanges.length < this.decorateWhenAtLeast) {
            return;
        }
        this.showDecorations();
    }

    /**
     * Show every match found so far, whatever was shown last.
     *
     * Called once the grep is over - however it ended - so that the highlights on screen are the
     * complete set. Skipping an update is only ever a delay: the matches it would have shown are
     * still in allRanges, and this is what finally puts them on screen.
     */
    protected showDecorations(): void {
        this.optionalService.setRanges(this.allRanges).doService();

        const shown = this.allRanges.length;
        this.decorateWhenAtLeast = Math.max(
            shown + GrepService.BATCH_SIZE,
            Math.ceil(shown * GrepService.DECORATION_GROWTH));
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
