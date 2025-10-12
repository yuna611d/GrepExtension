import * as os from 'os';
import { isNullOrUndefined, isNull } from "util";
import * as vscode from 'vscode';
import { BaseDao } from '../DAO/BaseDao';
import { SettingDao } from '../DAO/SettingDao';

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
            const osType = os.type();
            if (osType === 'Windows_NT') {
                return this._dirSeparator =  "\\";
            } else {
                return this._dirSeparator = "/";
            }
        }
        return this._dirSeparator;
    }
    private static _dirSeparator: string | null = null;

    public static get DAO(): BaseDao {
        if (isNullOrUndefined(this._dao)) {
            this._dao = new SettingDao();
        }
        return this._dao;
    }
    public static set DAO(dao: BaseDao) {
        this._dao = dao;
    }
    private static _dao: BaseDao;

}