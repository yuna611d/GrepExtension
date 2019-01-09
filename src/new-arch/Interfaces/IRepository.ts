import { BaseEntity } from "../SharedKernel/BaseEntity";

export interface IRepository {
    GetByID(id: number): BaseEntity;
    List(): Array<BaseEntity>;
    Add(entity: BaseEntity): void;
    Update(entity: BaseEntity): void;
    Delete(entity: BaseEntity): void;    
}