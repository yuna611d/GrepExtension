import { Configuration } from '../Configurations/Configuration';

export abstract class UtilFactory {
    protected _conf: Configuration;

    constructor(configuration: Configuration) {
        this._conf = configuration;
    }
    public abstract retrieve(): UtilBase;
}

export class UtilBase {
    protected _conf: Configuration;
    constructor(configuration: Configuration) {
        this._conf = configuration;
    }
}