import {
    Configuration
} from "./Configuration";
import {
    LinkUtil, LinkUtilFactory
} from "./LinkUtil";

export class ContentUtilFactory {
    private _conf: Configuration;

    constructor(configuration: Configuration) {
        this._conf = configuration;
    }
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

export class ContentUtil {

    protected _conf: Configuration;
    protected _linkUtil: LinkUtil;
    protected _contentTitle: string[] = ["GrepConf","FilePath", "lineNumber", "TextLine"];
    protected _grepConfText: string = "";
    protected LINE_BREAK = "";

    constructor(configuration: Configuration) {
        this._conf = configuration;
        this.LINE_BREAK = this._conf.LINE_BREAK;
        this._linkUtil = new LinkUtilFactory(configuration).retrieve();
    }

    public setGrepConf(baseDir: string, searchWord: string, isRegExpMode: boolean) {
        let searchDirText = `Search Dir: ${baseDir}`;
        let searchWordText = `Search Word: ${searchWord}`;
        let regExpModeText = "RegExpMode: " + (isRegExpMode ? "ON" : "OFF");
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

    public getContent(filePath: string, lineNumber: string, line: string) {
        let path = this._linkUtil.getFilePath(filePath);
        let content = this.getFormattedContent([this._grepConfText, path, lineNumber, line]);
        return content;
    }

    protected getFormatedTitle(titleItems: string[]) {
        titleItems[0] = "";
        return titleItems.join(this.LINE_BREAK);
    }

    protected getFormattedContent(contents: string[]) {
        contents[0] = "";
        let separator = "\t";
        return contents.join(separator);
    }

}

export class ContentUtilCSV extends ContentUtil {

    public getTitle() {
        return "";
    }

    protected getFormatedTitle(titleItems: string[]) {
        let separator = " | ";
        return titleItems.join(separator);
    }

    protected getFormattedContent(contents: string[]) {
        if (!this._conf.isOutputTitle()) {
            contents.shift();
        }

        let replacedContents = new Array<string>();
        contents.forEach(value => {
            value = `"${value.replace('"', '""')}"`;
            replacedContents.push(value);
        });

        let separator = ",";
        return replacedContents.join(separator);
    }
}

export class ContentUtilTSV extends ContentUtilCSV {

    protected getFormattedContent(contents: string[]) {
        if (!this._conf.isOutputTitle()) {
            contents.shift();
        }

        let separator = "\t";
        return contents.join(separator);
    }
}

export class ContentUtilJSON extends ContentUtil {
    // TODO implment in the future
}