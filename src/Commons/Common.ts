import * as os from 'os';
import * as vscode from 'vscode';
import { BaseDao } from '../DAO/BaseDao';
import { SettingDao } from '../DAO/SettingDao';
import { Lazy } from './Lazy';

export class Common {
    public static readonly LINE_BREAK = "\n";

    /**
     * Every folder the open workspace is made of, in the order VS Code lists them.
     *
     * A workspace is not one folder. VS Code lets several be opened together - an app beside the
     * library it uses, beside its docs - and only the first of them used to be searched: the rest
     * were passed over silently, so a word sitting in plain sight in the second folder was
     * reported as not being in the workspace at all.
     *
     * A folder with a blank path is dropped here rather than walked. Nothing can be searched
     * under one, and it is the same emptiness that BASE_DIR is checked for before a search runs,
     * so the two answer from one place instead of disagreeing.
     */
    public static get BASE_DIRS(): string[] {
        return Common.folderPaths(vscode.workspace.workspaceFolders);
    }

    /**
     * The searchable paths among the folders given, which is what BASE_DIRS answers with. Taking
     * the folders as an argument rather than reading them keeps it answerable without a running
     * editor to open a workspace in.
     */
    public static folderPaths(folders: readonly { uri: { fsPath: string } }[] | undefined | null): string[] {
        if (folders === null || folders === undefined) {
            return [];
        }
        return folders.map(folder => folder.uri.fsPath).filter(fsPath => fsPath.trim() !== "");
    }

    /**
     * The folder this extension writes its result file into: the first of the workspace's, or ""
     * when no folder is open. The search itself covers every folder - see BASE_DIRS - but its
     * result is one file, and the first folder is where it has always been put.
     */
    public static get BASE_DIR(): string {
        return Common.BASE_DIRS[0] ?? "";
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