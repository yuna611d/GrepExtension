import { Common } from "../Commons/Common";
import { BaseModel } from "../Interface/IModel";
import { isNull } from "util";


export class ContentModel extends BaseModel {

    protected _contentTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConfText: string = "";
    protected _separator: string = "\t";


    public get columnInfo() {
        return {
            title:                             0,       // column[0]               : Title
            filePath:   this.hasOutputTitle() ? 1 : 0,  // column[1] or coulumn[2] : filePath
            lineNumber: this.hasOutputTitle() ? 2 : 1,  // column[2] or coulumn[1] : lineNumber
            content:    this.hasOutputTitle() ? 3 : 2   // column[3] or coulumn[2] : pickedLineText
        };
    }


    public get SEPARATOR() {
        return this._separator;
    }

    public setGrepConf(baseDir: string, wordFindConfig: {searchWord: string; isRegExpMode: boolean; }) {        
        let searchDirText =  `Search Dir: ${baseDir}`;
        let searchWordText = `Search Word: ${wordFindConfig.searchWord}`;
        let regExpModeText = "RegExpMode: " + (wordFindConfig.isRegExpMode ? "ON" : "OFF");
        this._grepConfText= this.getFormatedTitle([searchDirText, searchWordText, regExpModeText]);
    }

    public getTitle() {
        if (!this.hasOutputTitle()) {
            return "";
        }
        return this._grepConfText;
    }

    public getContentTitle() {
        let contentTitle = this.getFormattedContent(this._contentTitle);
        return contentTitle;
    }

    public getContent(filePath: string, lineNumber: string, line: string): string {
        let content = this.getFormattedContent([this._grepConfText, filePath, lineNumber, line]);
        return content;
    }


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

export class ContentCSVModel extends ContentModel {

    protected _separator: string = ",";

    public getTitle() {
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

export class ContentTSVModel extends ContentCSVModel {
    protected _separator: string = "\t";

    protected getFormattedContent(contents: string[]) {
        if (!this.hasOutputTitle()) {
            contents.shift();
        }
        return contents.join(this.SEPARATOR);
    }
}

export class ContentJSONModel extends ContentModel {
    // TODO implment in the future
}