import { Common } from "../../../Commons/Common";
import { ResultContentModel } from "./ResultContentModel";

/**
 * Streams matches out as a JSON array, one insert per match (same append-only model as
 * txt/csv/tsv, so a cancelled grep still leaves a partial-but-valid result once addFooter runs).
 * Decoration highlighting is intentionally disabled for this format: JSON.stringify escaping means
 * a matched substring's raw index doesn't map 1:1 to its escaped position inside the "text" field.
 */
export class ResultContentJSONModel extends ResultContentModel {

    private static readonly EMPTY_COLUMN_TITLE: string = "";

    private _hasWrittenElement = false;

    public get Title(): string {
        if (!this.hasOutputTitle()) {
            return "[";
        }
        this._hasWrittenElement = true;
        return "[" + Common.LINE_BREAK + this._grepConditionText;
    }

    protected getFormatedTitle(titleItems: string[]): string {
        return JSON.stringify({ grepCondition: titleItems });
    }

    public get ColumnTitle(): string {
        // json has no separate header row; each element carries its own keys.
        return ResultContentJSONModel.EMPTY_COLUMN_TITLE;
    }

    protected getFormattedContent(contents: string[]): string {
        const [, filePath, lineNumber, line] = contents;
        const element = JSON.stringify({ filePath, lineNumber: Number(lineNumber), text: line });
        const prefix = this._hasWrittenElement ? ("," + Common.LINE_BREAK) : "";
        this._hasWrittenElement = true;
        return prefix + element;
    }

    public extractContentAndOffset(_lineText: string): { text: string; offset: number } | null {
        return null;
    }

    public async addFooter(): Promise<void> {
        await this.insertAndStackContent(Common.LINE_BREAK + "]");
    }

}
