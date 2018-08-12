import { Configuration } from "./Configuration";

export class ContentUtil {

    private _conf: Configuration;
    private LINE_BREAK = "";
    private SEPARATOR = "";
    
    constructor(configuration: Configuration) {
        this._conf = configuration;
        this.LINE_BREAK = this._conf.LINE_BREAK;
    }

    public getTitle(baseDir: string, searchWord: string, isRegExpMode: boolean) {
        if (!this._conf.isOutputTitle()) {
            return "";
        }

        let title = `Search Dir: ${baseDir}`;
        title += this.LINE_BREAK + `Search Word: ${searchWord}`;
        title += this.LINE_BREAK + "RegExpMode: ";
        title += isRegExpMode ? "ON" : "OFF";
        return title;
    }

    public getContent(filePath: string, lineNumber: string, line: string) {
        let content = this.getFormattedContent(["", filePath, lineNumber, line]);
        return content;
    }

    public getFormattedContent(contents: string[]) {
        this.determineSeparator();
        //TODO implement json format in the futrue
        return contents.join(this.SEPARATOR);
    }

    private determineSeparator() {
        if (this.SEPARATOR === "") {
            let format = this._conf.getOutputContentFormat();
            let separator = "\t"
            switch (format) {
                case "tsv":
                    separator = "\t";
                    break;
                case "csv":
                    separator = ","
                    break;
                case "json":
                    // TODO implement in the futrue
                default:
                    separator = "\t";
                    break;
            }
            this.SEPARATOR = separator;
        } else {
            return;
        }
    }
}