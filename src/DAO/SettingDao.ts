import { BaseDao } from './BaseDao';
import * as vscode from 'vscode';

export class SettingDao extends BaseDao{

    public getSettingValue(key: string, defaultValue: string): string;
    public getSettingValue(key: string, defaultValue: string[]): string[];
    public getSettingValue(key: string, defaultValue: boolean): boolean;


    /**
     * Gets the setting value. Type of returned value is determined by type of default value
     * @param key 
     * @param defaultValue 
     */
    public getSettingValue(key: string, 
        defaultValue: string | string[] | boolean): string | string[] | boolean {
        
        // Get the value from setting.json
        const value = this.getValue(key);
        // If any value is configured in setting.json, passed default value is returned.
        if (value === null || value === undefined) {
            return defaultValue;
        } else {
            if (typeof value !== 'boolean' && value.length === 0) {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Get value from key. If you override this function, data source of getSettingValue function will be changed.
     * @param key 
     */
    protected getValue(key: string) {
        return vscode.workspace.getConfiguration('grep2file').get<string | string[] | boolean>(key);
    }

}