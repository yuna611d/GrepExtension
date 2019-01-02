import * as vscode from 'vscode';
import {
    isNullOrUndefined,
    isNull
} from 'util';

export class Configuration {
    
    public _dao = new SettingDAO();

    public readonly LINE_BREAK = "\n";

    /**
     * Get file extensions which should be ignored when file search.
     */
    public getExcludedFileExtensions(): string[] {
        if (isNull(this._excludedFileExtensions)) {
            return this._excludedFileExtensions = this._dao.getSettingValue('exclude',['']);
        }
        return this._excludedFileExtensions;
    }
    public _excludedFileExtensions: string[] | null = null;


    /**
     * output file name.
     */
    public getOutputFileName(): string {
        if (isNull(this._outputFileName)) {
            let defaultFileName = 'grep2File.g2f';
            // configuration for output file name
            return this._outputFileName = this._dao.getSettingValue('outputFileName', defaultFileName);    
        }
        return this._outputFileName;
    }
    public _outputFileName: string | null = null;


    /**
     * Get the output content format.
     * You can opt from txt, tsv, csv.
     */
    public getOutputContentFormat(): string {
        if (isNull(this._outputContentFormat)) {
            let defaultFormat = "txt";
            // TOOD json format will be impelemented in the future
            let allowedContentFormats = ["txt", "tsv", "csv", "json"];
    
            let outputContentFormat: string = this._dao.getSettingValue('outputContentFormat', defaultFormat);
            if (allowedContentFormats.indexOf(outputContentFormat) === -1) {
                return this._outputContentFormat = defaultFormat;
            } else {
                return this._outputContentFormat = outputContentFormat;
            }
        }
        return this._outputContentFormat;
    }
    public _outputContentFormat: string | null = null;

    /**
     * You shouldn't output title of content if true is returned.
     */
    public isOutputTitle(): boolean {
        if (isNull(this._isOutputTitle)) {
            let isOutputTitle: boolean = this._dao.getSettingValue('outputTitle', true);
            return this._isOutputTitle = isOutputTitle;    
        }
        return this._isOutputTitle;
    }
    public _isOutputTitle: boolean | null = null;

    /**
     * You should ignore hidden file when file seek.
     */
    public ignoreHiddenFile(): boolean {
        if (isNull(this._ignoreHiddenFile)) {
            let ignoreHiddenFile: boolean = this._dao.getSettingValue('ignoreHiddenFile', true);
            return this._ignoreHiddenFile = ignoreHiddenFile;    
        }
        return this._ignoreHiddenFile;
    }
    public _ignoreHiddenFile: boolean | null = null;

    /**
     * Get current workspace folder path
     */
    public getBaseDir(): string {
        // TOOD in the futre, multi work space should be apply
        let baseDir = "";
        let workspaceForlders = vscode.workspace.workspaceFolders;
        if (!isNullOrUndefined(workspaceForlders) && workspaceForlders.length !== 0) {
            baseDir = workspaceForlders[0].uri.fsPath;
        }
        return baseDir;
    }

}

class SettingDAO {
    public getSettingValue(key: string, defaultValue: boolean): boolean;
    public getSettingValue(key: string, defaultValue: string): string;
    public getSettingValue(key: string, defaultValue: string[]): string[];

    /**
     * Gets the setting value. Type of returned value is determined by type of defualt value
     * @param key 
     * @param defaultValue 
     */
    public getSettingValue(key: string, defaultValue: any): any {
        // Get the value from setting.json
        let value = vscode.workspace.getConfiguration('grep2file').get(key);
        // If any value is configured in setting.json, passed defualt value is returned.
        return isNullOrUndefined(value) ? defaultValue : value;
    }
}