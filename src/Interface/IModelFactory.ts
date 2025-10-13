import { BaseDao } from '../DAO/BaseDao';
import { Common } from '../Commons/Common';
import { IModel } from './IModel';

export interface  IModelFactory {
    retrieve(): IModel;
}

export abstract class BaseModelFactory implements IModelFactory {

    protected _dao: BaseDao = Common.DAO;

    retrieve(): IModel {
        throw new Error('Method not implemented.');
    }
}


