import { ContentInformation } from "../Models/ContentInformation";

export class ContentInfomationFactory {
    private id = 0;
    
    public retrieve(content: string, lineNumber: number) {
        return new ContentInformation(this.id++, content, lineNumber);
    }
}