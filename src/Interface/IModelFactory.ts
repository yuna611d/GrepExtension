import { BaseDAO } from '../DAO/BaseDao';
import { Common } from '../Commons/Common';

export interface  IModelFactory {
    // retrieve(): IModel;
}

export abstract class BaseModelFactory implements IModelFactory {
    protected _dao: BaseDAO = Common.DAO;

    // retrieve(): IModel
}


