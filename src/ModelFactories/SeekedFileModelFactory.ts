import { SeekedFileModel } from "../Models/SeekedFileModel";
import { BaseModelFactory } from "../Interface/IModelFactory";
import { ResultFileModel } from "../Models/ResultFileModel";

export class SeekedModelFactory extends BaseModelFactory {

    public retrieve(fileName: string, targetDir: string, resultFileModel: ResultFileModel) {
        return new SeekedFileModel(this._dao, fileName, targetDir, resultFileModel);
    }
}