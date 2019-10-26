export class ResultContentTSVModel extends ResultContentCSVModel {
    protected _separator: string = "\t";

    protected getFormattedContent(contents: string[]) {
        if (!this.hasOutputTitle()) {
            contents.shift();
        }
        return contents.join(this.SEPARATOR);
    }
}
