import { Configuration } from '../Configurations/Configuration';

export abstract class UtilFactory {
    protected _conf: Configuration;

    constructor(Configuration: Configuration) {
        this._conf = Configuration;
    }
    public abstract retrieve(): UtilBase;
}

export class UtilBase {
    protected _conf: Configuration;
    constructor(Configuration: Configuration) {
        this._conf = Configuration;
    }
}