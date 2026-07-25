import { BaseModelFactory } from "../Interface/IModelFactory";
import { ResultFileModel } from "../Models/File/ResultFileModel";
import { SeekedFileModel } from "../Models/File/SeekedFileModel";
import { FileModel } from "../Models/File/FileModel";

export class FileModelFactory extends BaseModelFactory {

    public retrieve(): ResultFileModel;
    public retrieve(ileName: string, targetDir: string, excludedFullPaths: string[]): SeekedFileModel;

    public retrieve(fileName?: string, targetDir?: string, excludedFullPaths?: string[]): FileModel {
        if (fileName !== undefined && targetDir !== undefined && excludedFullPaths !== undefined) {
            return new SeekedFileModel(this._dao, fileName, targetDir, excludedFullPaths);
        } else {
            return new ResultFileModel(this._dao);
        }
    }
}