import { Common } from "../../../Commons/Common";
import { ResultContentModel } from "./ResultContentModel";

export class ResultContentCSVModel extends ResultContentModel {

    protected _separator = ",";

    private static readonly EMPTY_TITLE: string = "";
    protected static readonly QUOTE: string = '"';

    public get Title(): string {
        return ResultContentCSVModel.EMPTY_TITLE;
    }

    protected getFormatedTitle(titleItems: string[]) {
        const separator = " | ";
        return titleItems.join(separator);
    }

    /**
     * Appending would put a second column-title row in the middle of the file, which every reader
     * takes for a data row.
     */
    public readonly appendsToPreviousResult: boolean = false;

    /**
     * Unlike txt, which blanks the grep-condition field and keeps it, csv drops it outright when
     * the condition is not being written - so its data columns really do move left by one.
     */
    protected rowKeepsGrepConditionColumn(): boolean {
        return this.hasOutputTitle();
    }

    protected getFormattedContent(contents: string[]) {
        if (!this.hasOutputTitle()) {
            contents.shift();
        }
        // A trailing line break is required: ResultFileModel positions each insert at
        // Position(document.lineCount, 0), which only lands on a fresh line when the
        // previous insert actually ended one. Without it, rows are pasted together
        // with no separator at all.
        return contents.map(field => this.quoteField(field)).join(this.SEPARATOR) + Common.LINE_BREAK;
    }

    /**
     * Quote a field the way RFC 4180 requires, so that a matched line containing the separator
     * or a double quote does not shift every following column. Grepping source text for a common
     * word turns up such lines constantly - `foo(a, b)` or `say "hi"` - and without this a reader
     * (Excel, pandas, csv.reader, ...) silently mis-parses those rows.
     *
     * A field is wrapped in double quotes when it contains the separator, a double quote, or a
     * line break; any double quote inside it is doubled. Everything else is written as-is, which
     * keeps the common case byte-for-byte identical to plain joining.
     */
    protected quoteField(field: string): string {
        const quote = ResultContentCSVModel.QUOTE;
        const needsQuoting = field.includes(this.SEPARATOR)
            || field.includes(quote)
            || field.includes("\r")
            || field.includes("\n");

        if (!needsQuoting) {
            return field;
        }
        return quote + field.split(quote).join(quote + quote) + quote;
    }

    /**
     * The inherited implementation splits on every separator, which no longer identifies the
     * columns once quoting is in play: a quoted field may legitimately contain separators.
     * Parse the row back with the same quoting rules instead.
     */
    public extractContentAndOffset(lineText: string): { text: string; offset: number } | null {
        const field = this.splitRenderedFields(lineText)[this.columnPosition.content];
        return field ?? null;
    }

    /**
     * Split one rendered output row back into its fields.
     *
     * Each field is returned exactly as it appears in the document - surrounding quotes removed,
     * but a doubled inner quote left doubled - together with the column its text starts at. Both
     * halves describe the text on screen rather than the original value, which is what a
     * decoration range needs: an index into the returned text maps 1:1 onto a document column.
     */
    protected splitRenderedFields(lineText: string): Array<{ text: string; offset: number }> {
        const quote = ResultContentCSVModel.QUOTE;
        const separator = this.SEPARATOR;
        const fields: Array<{ text: string; offset: number }> = [];
        let position = 0;

        for (;;) {
            if (lineText.charAt(position) === quote) {
                const start = position + 1;
                let end = start;
                while (end < lineText.length) {
                    if (lineText.charAt(end) !== quote) { end++; continue; }
                    // A doubled quote is an escaped one and stays part of the field.
                    if (lineText.charAt(end + 1) === quote) { end += 2; continue; }
                    break;
                }
                fields.push({ text: lineText.slice(start, end), offset: start });
                position = end + 1;
            } else {
                const separatorPos = lineText.indexOf(separator, position);
                const end = separatorPos === -1 ? lineText.length : separatorPos;
                fields.push({ text: lineText.slice(position, end), offset: position });
                position = end;
            }

            const nextSeparator = lineText.indexOf(separator, position);
            if (nextSeparator === -1) {
                return fields;
            }
            position = nextSeparator + separator.length;
        }
    }
}
