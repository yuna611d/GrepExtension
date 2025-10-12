import { BaseDao } from "../DAO/BaseDao";

export type IModel = object;

export abstract class BaseModel implements IModel {
    protected _dao: BaseDao;

    constructor (dao: BaseDao) {
        this._dao = dao;
    }
}