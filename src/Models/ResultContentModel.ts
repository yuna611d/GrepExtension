import { Common } from "../Commons/Common";
import { BaseModel } from "../Interface/IModel";
import { isNull } from "util";


export class ResultContentModel extends BaseModel {

    protected _columnTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConfText: string = "";
    protected _separator: string = "\t";

    // ------ Meta informations ------
    public get SEPARATOR() {
        return this._separator;
    }

    public get columnPosition() {
        return {
            title:                              0,      // column[0]               : Title
            filePath:   this.hasOutputTitle() ? 1 : 0,  // column[1] or coulumn[2] : filePath
            lineNumber: this.hasOutputTitle() ? 2 : 1,  // column[2] or coulumn[1] : lineNumber
            content:    this.hasOutputTitle() ? 3 : 2   // column[3] or coulumn[2] : pickedLineText
        };
    }
    // ------ Meta informations ------


    //------ Contents ------
    public setGrepConf(baseDir: string, wordFindConfig: {searchWord: string; isRegExpMode: boolean; }) {        
        let searchDirText =  `Search Dir: ${baseDir}`;
        let searchWordText = `Search Word: ${wordFindConfig.searchWord}`;
        let regExpModeText = "RegExpMode: " + (wordFindConfig.isRegExpMode ? "ON" : "OFF");
        this._grepConfText= this.getFormatedTitle([searchDirText, searchWordText, regExpModeText]);
    }


    public get Title() {
        if (!this.hasOutputTitle()) {
            return "";
        }
        return this._grepConfText;
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
        let content = this.getFormattedContent([this._grepConfText, filePath, lineNumber, line]);
        return content;
    }

    //------ Contents ------


    protected getFormatedTitle(titleItems: string[]) {
        return titleItems.join(Common.LINE_BREAK);
    }

    protected getFormattedContent(contents: string[]) {
        contents[0] = "";
        return contents.join(this.SEPARATOR);
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

export class ResultContentCSVModel extends ResultContentModel {

    protected _separator: string = ",";

    public get Title() {
        return "";
    }

    protected getFormatedTitle(titleItems: string[]) {
        const separator = " | ";
        return titleItems.join(separator);
    }

    protected getFormattedContent(contents: string[]) {
        if (!this.hasOutputTitle()) {
            contents.shift();
        }
        return contents.join(this.SEPARATOR);
    }
}

export class ResultContentTSVModel extends ResultContentCSVModel {
    protected _separator: string = "\t";

    protected getFormattedContent(contents: string[]) {
        if (!this.hasOutputTitle()) {
            contents.shift();
        }
        return contents.join(this.SEPARATOR);
    }
}

export class ResultContentJSONModel extends ResultContentModel {
    // TODO implment in the future
}