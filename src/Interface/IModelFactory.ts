import { BaseDao } from '../DAO/BaseDao';
import { Common } from '../Commons/Common';

export interface  IModelFactory {
    // retrieve(): IModel;
}

export abstract class BaseModelFactory implements IModelFactory {
    protected _dao: BaseDao = Common.DAO;

    // retrieve(): IModel
}


