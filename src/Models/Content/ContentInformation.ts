
export class ContentInformation {

    constructor(id: number, content: string, lineNumber: number) {
        this.ID = id;
        this.Content = content;
        this.LineNumber = lineNumber;
    }

    public readonly ID: number = 0;
    public readonly Content: string = "";
    public readonly LineNumber: number = 0;
}