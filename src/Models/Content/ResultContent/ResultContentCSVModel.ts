import { Common } from "../../../Commons/Common";
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
        // A trailing line break is required: ResultFileModel positions each insert at
        // Position(document.lineCount, 0), which only lands on a fresh line when the
        // previous insert actually ended one. Without it, rows are pasted together
        // with no separator at all.
        return contents.join(this.SEPARATOR) + Common.LINE_BREAK;
    }
}
