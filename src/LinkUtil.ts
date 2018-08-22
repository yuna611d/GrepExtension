import { Configuration } from "./Configuration";

export class LinkUtilFactory {
    private _conf: Configuration;

    constructor(configuration: Configuration) {
        this._conf = configuration;
    }
    public retrieve() {
        let linkType = this._conf.getLinkType();
        switch (linkType) {
            case "No Link":
                return new LinkUtil(this._conf);
                break;
            case "Link to File":
                return new LinkUtilFile(this._conf);
                break;
            case "Link To Point":
                return new LinkUtilPoint(this._conf);
                break;
            default:
                return new LinkUtil(this._conf);
                break;
        }
    }
}

export class LinkUtil {

    protected _conf: Configuration;

    constructor(configuration: Configuration) {
        this._conf = configuration;
    }

    public getFilePath(filePath: string): string {
        return filePath;
    }

}

export class LinkUtilFile extends LinkUtil {
    public getFilePath(filePath: string): string {
        return "file://" + filePath;
    }
}

export class LinkUtilPoint extends LinkUtil {
}
