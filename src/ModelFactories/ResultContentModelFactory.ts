import { BaseModelFactory } from "../Interface/IModelFactory";
import { ResultFileModel } from "../Models/File/ResultFileModel";
import { isNullOrUndefined } from "util";
import { ResultContentModel } from "../Models/Content/ResultContent/ResultContentModel";
import { ResultContentTSVModel } from "../Models/Content/ResultContent/ResultContentTSVModel";
import { ResultContentCSVModel } from "../Models/Content/ResultContent/ResultContentCSVModel";
import { ResultContentJSONModel } from "../Models/Content/ResultContent/ResultContentJSONModel";

export class ResultContentModelFactory extends BaseModelFactory {
 
    protected resultFile: ResultFileModel;

    constructor(resultFileModel: ResultFileModel) {
        super();
        this.resultFile = resultFileModel;
    }
    public retrieve() {

        if (isNullOrUndefined(this.resultFile)) {
            return new ResultContentModel(this._dao, this.resultFile);
        }
        // TODO this should be duck or override function        
        const format = this.resultFile.FileExtension;

        switch (format) {
            case "txt":
                return new ResultContentModel(this._dao, this.resultFile);
                break;
            case "tsv":
                return new ResultContentTSVModel(this._dao, this.resultFile);
                break;
            case "csv":
                return new ResultContentCSVModel(this._dao, this.resultFile);
                break;
            case "json":
                // TODO implement in the future
                return new ResultContentJSONModel(this._dao, this.resultFile);
            default:
                return new ResultContentModel(this._dao, this.resultFile);
                break;
        }

    }
}
