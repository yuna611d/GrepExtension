import { BaseModelFactory } from "../Interface/IModelFactory";
import { BaseDao } from "../DAO/BaseDao";
import { ResultFileModel } from "../Models/File/ResultFileModel";
import { ResultContentModel } from "../Models/Content/ResultContent/ResultContentModel";
import { ResultContentTSVModel } from "../Models/Content/ResultContent/ResultContentTSVModel";
import { ResultContentCSVModel } from "../Models/Content/ResultContent/ResultContentCSVModel";
import { ResultContentJSONModel } from "../Models/Content/ResultContent/ResultContentJSONModel";

type ResultContentModelConstructor = new (dao: BaseDao, resultFile: ResultFileModel) => ResultContentModel;

// Registering a new output format only means adding an entry here, instead of a switch branch.
const MODEL_BY_FORMAT: Record<string, ResultContentModelConstructor> = {
    txt: ResultContentModel,
    tsv: ResultContentTSVModel,
    csv: ResultContentCSVModel,
    json: ResultContentJSONModel,
};

export class ResultContentModelFactory extends BaseModelFactory {

    protected resultFile: ResultFileModel;

    constructor(resultFileModel: ResultFileModel) {
        super();
        this.resultFile = resultFileModel;
    }

    public retrieve(): ResultContentModel {
        if (this.resultFile === null || this.resultFile === undefined) {
            return new ResultContentModel(this._dao, this.resultFile);
        }

        const ModelClass = MODEL_BY_FORMAT[this.resultFile.FileExtension] ?? ResultContentModel;
        return new ModelClass(this._dao, this.resultFile);
    }
}
