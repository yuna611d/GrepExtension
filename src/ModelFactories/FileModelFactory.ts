import { BaseModelFactory } from "../Interface/IModelFactory";
import { ResultFileModel } from "../Models/File/ResultFileModel";
import { SeekedFileModel } from "../Models/File/SeekedFileModel";
import { FileModel } from "../Models/File/FileModel";

export class FileModelFactory extends BaseModelFactory {

    public retrieve(): ResultFileModel;
    public retrieve(ileName: string, targetDir: string, excludedFileNames: string[]): SeekedFileModel;

    public retrieve(fileName?: string, targetDir?: string, excludedFileNames?: string[]): FileModel {
        if (fileName !== undefined && targetDir !== undefined && excludedFileNames !== undefined) {
            return new SeekedFileModel(this._dao, fileName, targetDir, excludedFileNames);
        } else {
            return new ResultFileModel(this._dao);
        }
    }
}