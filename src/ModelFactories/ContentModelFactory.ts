import { BaseModelFactory } from "../Interface/IModelFactory";
import { ContentModel, ContentTSVModel, ContentCSVModel, ContentJSONModel } from "../Models/ContentModel";
import { ResultFileModel } from "../Models/ResultFileModel";
import { isNullOrUndefined } from "util";

export class ContentModelFactory extends BaseModelFactory {
 
    protected resultFile: ResultFileModel;

    constructor(resultFileModel: ResultFileModel) {
        super();
        this.resultFile = resultFileModel;
    }
    public retrieve() {

        if (isNullOrUndefined(this.resultFile)) {
            return new ContentModel(this._dao);
        }
        // TOOD this should be duck or override function        
        const format = this.resultFile.FileExtension;

        switch (format) {
            case "txt":
                return new ContentModel(this._dao);
                break;
            case "tsv":
                return new ContentTSVModel(this._dao);
                break;
            case "csv":
                return new ContentCSVModel(this._dao);
                break;
            case "json":
                // TODO implement in the futrue
                return new ContentJSONModel(this._dao);
            default:
                return new ContentModel(this._dao);
                break;
        }

    }
}
