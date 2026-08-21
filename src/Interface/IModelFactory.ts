import { BaseDao } from '../DAO/BaseDao';
import { Common } from '../Commons/Common';
import { IModel } from './IModel';

export interface  IModelFactory {
    retrieve(): IModel;
}

export abstract class BaseModelFactory implements IModelFactory {

    protected _dao: BaseDao = Common.DAO;

    // Declared abstract rather than given a throwing body: every subclass overrides it, so the
    // body was unreachable, and this way the compiler enforces that rather than the runtime.
    abstract retrieve(): IModel;
}


