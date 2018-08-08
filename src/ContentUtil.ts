
export class ContentUtil {
    public static LINE_BREAK = "\n";

    public static getTitle(baseDir: string, searchWord: string, isRegExpMode: boolean) {
        let title = `Search Dir: ${baseDir}`;
        title += ContentUtil.LINE_BREAK + `Search Word: ${searchWord}`;
        title += ContentUtil.LINE_BREAK + "RegExpMode: ";
        title += isRegExpMode ? "ON" : "OFF";
        return title;
    }

    public static getContent(filePath: string, lineNumber: string, line: string) {
        let content = this.getFormattedContent(["", filePath, lineNumber, line]);
        return content;
    }

    public static getFormattedContent(contents: string[]) {
        let separator = "\t";
        return contents.join(separator);
    }
}