
import { UtilFactory, UtilBase } from "./UtilBase";

export class ContentUtilFactory extends UtilFactory {

    public retrieve() {
        let format = this._conf.getOutputContentFormat();
        switch (format) {
            case "txt":
                return new ContentUtil(this._conf);
                break;
            case "tsv":
                return new ContentUtilTSV(this._conf);
                break;
            case "csv":
                return new ContentUtilCSV(this._conf);
                break;
            case "json":
                // TODO implement in the futrue
                return new ContentUtilJSON(this._conf);
            default:
                return new ContentUtil(this._conf);
                break;
        }
    }
}

export class ContentUtil extends UtilBase {

    protected _contentTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConfText: string = "";
    protected LINE_BREAK = this._conf.LINE_BREAK;
    
    public get columnInfo() {
        return {
            title: 0,
            filePath: this._conf.isOutputTitle() ? 1 : 0,
            lineNumber: this._conf.isOutputTitle() ? 2 : 1,
            content: this._conf.isOutputTitle() ? 3 : 2    
        };
    }

    public get SEPARATOR() {
        return this._separator;
    }
    protected _separator: string = "\t";



    public setGrepConf(baseDir: string, wordFindConfig: {searchWord: string; isRegExpMode: boolean; }) {        
        let searchDirText = `Search Dir: ${baseDir}`;
        let searchWordText = `Search Word: ${wordFindConfig.searchWord}`;
        let regExpModeText = "RegExpMode: " + (wordFindConfig.isRegExpMode ? "ON" : "OFF");
        this._grepConfText= this.getFormatedTitle([searchDirText, searchWordText, regExpModeText]);
    }

    public getTitle() {
        if (!this._conf.isOutputTitle()) {
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
        return titleItems.join(this.LINE_BREAK);
    }

    protected getFormattedContent(contents: string[]) {
        contents[0] = "";
        return contents.join(this.SEPARATOR);
    }

}

export class ContentUtilCSV extends ContentUtil {

    protected _separator: string = ",";

    public getTitle() {
        return "";
    }

    protected getFormatedTitle(titleItems: string[]) {
        const separator = " | ";
        return titleItems.join(separator);
    }

    protected getFormattedContent(contents: string[]) {
        if (!this._conf.isOutputTitle()) {
            contents.shift();
        }

        return contents.join(this.SEPARATOR);
    }
}

export class ContentUtilTSV extends ContentUtilCSV {

    protected _separator: string = "\t";

    protected getFormattedContent(contents: string[]) {
        if (!this._conf.isOutputTitle()) {
            contents.shift();
        }

        return contents.join(this.SEPARATOR);
    }
}

export class ContentUtilJSON extends ContentUtil {
    // TODO implment in the future
}