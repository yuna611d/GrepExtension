import { ResultContentModel } from "./ResultContentModel";

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
