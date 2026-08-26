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

    /**
     * Decodes with the editor's own rules, so a search sees each file the way opening it would:
     * a byte order mark is honoured and removed, `files.encoding` is applied - including any
     * per-language or per-file override - and `files.autoGuessEncoding`, when the user has turned
     * it on, guesses the rest.
     *
     * Decoding can fail, most often because VS Code considers the content binary. Falling back to
     * UTF-8 leaves such a file exactly as readable as it was before any of this existed, rather
     * than dropping it from the search or failing the search outright.
     */
    public async decodeContent(content: Uint8Array, filePath: string): Promise<string> {
        try {
            return await vscode.workspace.decode(content, { uri: vscode.Uri.file(filePath) });
        } catch {
            return Buffer.from(content).toString('utf8');
        }
    }

    /**
     * Naming the encoding is what takes the settings out of the decision: VS Code applies the one
     * asked for rather than the one it would have picked, which is what searching a file under
     * several encodings in turn needs.
     *
     * An encoding VS Code does not know falls back to the configured default, and content it
     * refuses throws; either way the bytes read as UTF-8 are a usable answer rather than a failed
     * search, and a reading that is wrong for this encoding simply will not match.
     */
    public async decodeContentAs(content: Uint8Array, encoding: string): Promise<string> {
        try {
            return await vscode.workspace.decode(content, { encoding });
        } catch {
            return Buffer.from(content).toString('utf8');
        }
    }

}