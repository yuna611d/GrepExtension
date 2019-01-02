import { BaseModel } from "../Interface/IModel";

export abstract class FileModel extends BaseModel{
    protected encoding = "utf-8";

    abstract get FileName(): string;
    abstract get FileExtension(): string;
    abstract get FileNameWithExtension(): string;
    abstract get FilePath(): string;
}