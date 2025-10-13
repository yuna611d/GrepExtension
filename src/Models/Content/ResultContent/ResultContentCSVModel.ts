import { ResultContentModel } from "./ResultContentModel";

export class ResultContentCSVModel extends ResultContentModel {

    protected _separator = ",";

    private static readonly EMPTY_TITLE: string = "";

    public get Title(): string {
        return ResultContentCSVModel.EMPTY_TITLE;
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
