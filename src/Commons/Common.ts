import * as os from 'os';
import { isNullOrUndefined, isNull } from "util";
import * as vscode from 'vscode';
import { BaseDAO } from '../DAO/BaseDao';
import { SettingDAO } from '../DAO/SettingDao';

export class Common {
    public static readonly LINE_BREAK = "\n";

    /**
     * Get current workspace folder path
     */
    public static get BASE_DIR(): string {
        // TODO in the future, multi work space should be apply
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!isNullOrUndefined(workspaceFolders) && workspaceFolders.length !== 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return "";
    }

    /**
     * Get the separator of file. 
     */
    public static get DIR_SEPARATOR(): string {
        if (isNull(this._dirSeparator)) {
            let osType = os.type();
            if (osType === 'Windows_NT') {
                return this._dirSeparator =  "\\";
            } else {
                return this._dirSeparator = "/";
            }
        }
        return this._dirSeparator;
    }
    private static _dirSeparator: string | null = null;

    public static get DAO(): BaseDAO {
        if (isNullOrUndefined(this._dao)) {
            this._dao = new SettingDAO();
        }
        return this._dao;
    }
    public static set DAO(dao: BaseDAO) {
        this._dao = dao;
    }
    private static _dao: BaseDAO;

}