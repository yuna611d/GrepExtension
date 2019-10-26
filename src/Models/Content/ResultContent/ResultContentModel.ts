import { Common } from "../../Commons/Common";
import { BaseModel } from "../../Interface/IModel";
import { isNull } from "util";
import { ResultFileModel } from "../File/ResultFileModel";
import { BaseDAO } from "../../DAO/BaseDao";
import { TextEdit } from "vscode";
import { ContentInformation } from "./ContentInformation";
import { ContentInformationFactory as ContentInformationFactory } from "../../ModelFactories/ContentInfomationFactory";


export class ResultContentModel extends BaseModel {

    constructor(dao: BaseDAO, resultFileModel: ResultFileModel) {
        super(dao);
        this._resultFileModel = resultFileModel;
        this._contentFactory = new ContentInformationFactory();
    }
    private _resultFileModel: ResultFileModel;
    private _contentFactory: ContentInformationFactory;

    protected _columnTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConditionText: string = "";
    protected _separator: string = "\t";

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
        let contentTitle = this.getFormattedContent(this._columnTitle);
        return contentTitle;
    }
    
    /**
     * Contents which are in a line.
     * @param filePath 
     * @param lineNumber 
     * @param line 
     */
    public getContentInOneLine(filePath: string, lineNumber: string, line: string): string {
        let content = this.getFormattedContent([this._grepConditionText, filePath, lineNumber, line]);
        return content;
    }
    //------ Contents ------


    contentInformations: Array<ContentInformation> = new Array<ContentInformation>();


    //------ Operation of ResultFile (Interact with Service) ------
    public async addTitle() {
        const content = this.Title;
        // Insert result to file and stack content.
        return await this.insertAndStackContent(content);
    }
    public async addColumnTitle() {
        const content = this.ColumnTitle;
        // Insert result to file and stack content.
        return await this.insertAndStackContent(content);
    }

    public async addLine(filePath: string, lineNumber: string, line: string) {
        // Get formated content
        const content = this.getFormattedContent([this._grepConditionText, filePath, lineNumber, line]);
        // Insert result to file and stack content.
        return await this.insertAndStackContent(content);
    }

    private async insertAndStackContent(content: string) {
        // Insert result
        const insertedLineNumber = await this._resultFileModel.insertText(content);
        // Stack ContentInformation
        const contentInfo = this._contentFactory.retrieve(content, insertedLineNumber);
        this.contentInformations.push(contentInfo);

        // return inserted line number
        return insertedLineNumber;
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
        if (isNull(this._hasOutputTitle)) {
            return this._hasOutputTitle = this._dao.getSettingValue('outputTitle', true);   
        }
        return this._hasOutputTitle;
    }
    protected _hasOutputTitle: boolean | null = null;
 

}