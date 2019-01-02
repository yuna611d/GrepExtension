import { BaseModelFactory } from "../Interface/IModelFactory";
import { ResultFileModel } from "../Models/ResultFileModel";

export class ResultFileModelFactory extends BaseModelFactory {
    public retrieve() {
        return new ResultFileModel(this._dao);
    }
}