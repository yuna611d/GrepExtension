import { BaseDAO } from './BaseDAO';
import * as vscode from 'vscode';
import {
    isNullOrUndefined
} from 'util';

export class SettingDAO extends BaseDAO{
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