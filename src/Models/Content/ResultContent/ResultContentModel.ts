import { Common } from "../../../Commons/Common";
import { BaseModel } from "../../../Interface/IModel";
import { ResultFileModel } from "../../File/ResultFileModel";
import { BaseDao } from "../../../DAO/BaseDao";
import { ContentInformation } from "../ContentInformation";
import { ContentInformationFactory as ContentInformationFactory } from "../../../ModelFactories/ContentInfomationFactory";


export class ResultContentModel extends BaseModel {

    constructor(dao: BaseDao, resultFileModel: ResultFileModel) {
        super(dao);
        this._resultFileModel = resultFileModel;
        this._contentFactory = new ContentInformationFactory();
    }
    private _resultFileModel: ResultFileModel;
    private _contentFactory: ContentInformationFactory;

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

    protected _lineNumberOfCursor = 0;
    public get lineNumberOfCursor(): number {
        return this._lineNumberOfCursor;
    }
    protected _lineNumberOfContentStart = 0;
    public get lineNumberOfContentStart(): number {
        return this._lineNumberOfContentStart;
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


    contentInformations: Array<ContentInformation> = new Array<ContentInformation>();


    //------ Operation of ResultFile (Interact with Service) ------
    public async addTitle() {
        const content = this.Title;
        // Insert result to file and stack content.
        this._lineNumberOfContentStart = await this.insertAndStackContent(content);        
    }
    public async addColumnTitle() {
        const content = this.ColumnTitle;
        // Insert result to file and stack content.
        this._lineNumberOfContentStart = await this.insertAndStackContent(content);        
    }

    public async addLine(filePath: string, lineNumber: string, line: string) {
        // Get formated content
        const content = this.getFormattedContent([this._grepConditionText, filePath, lineNumber, line]);
        // Insert result to file and stack content.
        this._lineNumberOfCursor = await this.insertAndStackContent(content);
    }

    /**
     * Same as calling addLine() once per entry, but writes the whole batch with a single
     * editor edit instead of one edit per line. Returns, for each entry in the same order,
     * the document line it landed on plus its searchable-text offset (for decoration ranges)
     * so callers never need to read the document back to find out where their match ended up.
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

        const firstLineNumber = await this.insertAndStackContentBlock(formattedContents);

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

        this._lineNumberOfCursor = firstLineNumber + formattedContents.length - 1;
        return results;
    }

    /**
     * Called once after grepping finishes (success or cancellation). No-op by default;
     * overridden by formats that need to close a wrapping structure (e.g. json's closing "]").
     */
    public async addFooter(): Promise<void> {
        // no-op for txt/csv/tsv
    }

    protected async insertAndStackContent(content: string) {
        // Insert result
        const insertedLineNumber = await this._resultFileModel.insertText(content);
        // Stack ContentInformation
        const contentInfo = this._contentFactory.retrieve(content, insertedLineNumber);
        this.contentInformations.push(contentInfo);

        // return inserted line number
        return insertedLineNumber;
    }

    /**
     * Batched counterpart of insertAndStackContent(): writes several already-formatted chunks
     * with one editor edit and returns the document line of the first chunk.
     */
    protected async insertAndStackContentBlock(formattedContents: string[]): Promise<number> {
        const combinedContent = formattedContents.join('');
        const firstLineNumber = await this._resultFileModel.insertTextBlock(combinedContent);

        formattedContents.forEach((content, i) => {
            const contentInfo = this._contentFactory.retrieve(content, firstLineNumber + i);
            this.contentInformations.push(contentInfo);
        });

        return firstLineNumber;
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
        if (this._hasOutputTitle === null) {
            return this._hasOutputTitle = this._dao.getSettingValue('outputTitle', true);   
        }
        return this._hasOutputTitle;
    }
    protected _hasOutputTitle: boolean | null = null;
 

}