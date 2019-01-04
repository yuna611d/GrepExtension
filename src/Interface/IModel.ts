import { BaseDAO } from "../DAO/BaseDAO";

export interface IModel {

}

export abstract class BaseModel implements IModel {
    protected _dao: BaseDAO;

    constructor (dao: BaseDAO) {
        this._dao = dao;
    }
}