import { Common } from "../../../Commons/Common";
import { Lazy } from "../../../Commons/Lazy";
import { BaseModel } from "../../../Interface/IModel";
import { ResultFileModel } from "../../File/ResultFileModel";
import { BaseDao } from "../../../DAO/BaseDao";


export class ResultContentModel extends BaseModel {

    constructor(dao: BaseDao, resultFileModel: ResultFileModel) {
        super(dao);
        this._resultFileModel = resultFileModel;
    }
    private _resultFileModel: ResultFileModel;

    protected _columnTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConditionText = "";
    protected _separator = "\t";

    // ------ Meta information ------
    public get SEPARATOR() {
        return this._separator;
    }

    public get columnPosition() {
        return {
            title:                              0,      // column[0]              : Title
            filePath:   this.hasOutputTitle() ? 1 : 0,  // column[1] or column[2] : filePath
            lineNumber: this.hasOutputTitle() ? 2 : 1,  // column[2] or column[1] : lineNumber
            content:    this.hasOutputTitle() ? 3 : 2   // column[3] or column[2] : pickedLineText
        };
    }

    // ------ Meta information ------


    //------ Contents ------
    public setGrepConditionText(baseDir: string, wordFindConfig: {searchWord: string; isRegExpMode: boolean; }) {        
        const searchDirText =  `Search Dir: ${baseDir}`;
        const searchWordText = `Search Word: ${wordFindConfig.searchWord}`;
        const regExpModeText = "RegExpMode: " + (wordFindConfig.isRegExpMode ? "ON" : "OFF");
        this._grepConditionText = this.getFormatedTitle([searchDirText, searchWordText, regExpModeText]);
    }


    public get Title() {
        if (!this.hasOutputTitle()) {
            return "";
        }
        return this._grepConditionText;
    }

    public get ColumnTitle() {
        const contentTitle = this.getFormattedContent(this._columnTitle);
        return contentTitle;
    }
    
    /**
     * Contents which are in a line.
     * @param filePath 
     * @param lineNumber 
     * @param line 
     */
    public getContentInOneLine(filePath: string, lineNumber: string, line: string): string {
        const content = this.getFormattedContent([this._grepConditionText, filePath, lineNumber, line]);
        return content;
    }
    /**
     * Extract the searchable text and its character offset within lineText (a line of this model's
     * own formatted output, e.g. one row previously produced by getContentInOneLine).
     * Returns null when this format has no meaningful searchable offset (see ResultContentJSONModel).
     */
    public extractContentAndOffset(lineText: string): { text: string; offset: number } | null {
        const splittedTexts = lineText.split(this.SEPARATOR);
        const contentText = (splittedTexts.length >= this.columnPosition.content) ? splittedTexts[this.columnPosition.content] : "";
        const offset = splittedTexts.map(x => x.length)
                                     .reduce((a, v, i) => (i < this.columnPosition.content) ? a + v + this.SEPARATOR.length : a) + this.SEPARATOR.length;
        return { text: contentText, offset };
    }
    //------ Contents ------


    //------ Operation of ResultFile (Interact with Service) ------
    public async addTitle() {
        await this.insertContent(this.Title);
    }
    public async addColumnTitle() {
        await this.insertContent(this.ColumnTitle);
    }

    /**
     * Write a batch of matches with a single editor edit rather than one edit per line, each of
     * which would cost a round-trip to the main/renderer process. Returns, for each entry in the
     * same order, the document line it landed on plus its searchable-text offset (for decoration
     * ranges) so callers never need to read the document back to find out where their match
     * ended up.
     */
    public async addLines(entries: Array<{ filePath: string; lineNumber: string; line: string }>)
        : Promise<Array<{ documentLineNumber: number; extracted: { text: string; offset: number } | null }>> {

        if (entries.length === 0) {
            return [];
        }

        // Build every entry's formatted content up front (pure string work, no editor round-trip).
        const formattedContents = entries.map(e =>
            this.getFormattedContent([this._grepConditionText, e.filePath, e.lineNumber, e.line])
        );

        const firstLineNumber = await this.insertContentBlock(formattedContents);

        // extractContentAndOffset expects a single document line (no trailing break), the same
        // shape LineMatcher.splitIntoNumberedLines used to hand it back when this ran off a
        // full-document rescan. Strip the trailing Common.LINE_BREAK that getFormattedContent
        // adds before handing each chunk over.
        const results = formattedContents.map((content, i) => {
            const lineText = content.endsWith(Common.LINE_BREAK)
                ? content.slice(0, -Common.LINE_BREAK.length)
                : content;
            return {
                documentLineNumber: firstLineNumber + i,
                extracted: this.extractContentAndOffset(lineText)
            };
        });

        return results;
    }

    /**
     * Called once after grepping finishes (success or cancellation). No-op by default;
     * overridden by formats that need to close a wrapping structure (e.g. json's closing "]").
     */
    public async addFooter(): Promise<void> {
        // no-op for txt/csv/tsv
    }

    /**
     * Whether a grep may write below what the previous grep left in the result file.
     *
     * True only for txt, which has kept a running log of successive searches since 0.1.7 and
     * stays readable that way - each search is introduced by its own condition block. A format
     * that has to be one well-formed document cannot do this and says so by overriding.
     */
    public readonly appendsToPreviousResult: boolean = true;

    /**
     * Write one already-formatted chunk and return the document line it landed on.
     * The seam subclasses use to reach the result file, which is private to this class.
     */
    protected async insertContent(content: string): Promise<number> {
        return await this._resultFileModel.insertText(content);
    }

    /**
     * Batched counterpart of insertContent(): writes several already-formatted chunks with one
     * editor edit and returns the document line of the first chunk.
     */
    protected async insertContentBlock(formattedContents: string[]): Promise<number> {
        return await this._resultFileModel.insertTextBlock(formattedContents.join(''));
    }
    //------ Operation  of ResultFile (Interact with Service) ------



    protected getFormatedTitle(titleItems: string[]) {
        return titleItems.join(Common.LINE_BREAK);
    }

    protected getFormattedContent(contents: string[]) {
        contents[0] = "";
        return contents.join(this.SEPARATOR) + Common.LINE_BREAK;
    }

    /**
     * You shouldn't output title of content if true is returned.
     */
    protected hasOutputTitle(): boolean {
        return this._hasOutputTitle.get();
    }
    protected _hasOutputTitle = new Lazy(() => this._dao.getSettingValue('outputTitle', true));
 

}