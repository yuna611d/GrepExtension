import * as os from 'os';
import * as vscode from 'vscode';
import { BaseDao } from '../DAO/BaseDao';
import { SettingDao } from '../DAO/SettingDao';
import { Lazy } from './Lazy';

export class Common {
    public static readonly LINE_BREAK = "\n";

    /**
     * Get current workspace folder path
     */
    public static get BASE_DIR(): string {
        // TODO in the future, multi work space should be apply
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders !== null && workspaceFolders !== undefined && workspaceFolders.length !== 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return "";
    }

    /**
     * Get the separator of file. 
     */
    public static get DIR_SEPARATOR(): string {
        return this._dirSeparator.get();
    }
    private static readonly _dirSeparator = new Lazy(() => os.type() === 'Windows_NT' ? "\\" : "/");

    public static get DAO(): BaseDao {
        if (this._dao === null || this._dao === undefined) {
            this._dao = new SettingDao();
        }
        return this._dao;
    }
    public static set DAO(dao: BaseDao) {
        this._dao = dao;
    }
    private static _dao: BaseDao;

}