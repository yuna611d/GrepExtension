export abstract class BaseDAO {
    public abstract getSettingValue(key: string, defaultValue: boolean): boolean;
    public abstract getSettingValue(key: string, defaultValue: string): string;
    public abstract getSettingValue(key: string, defaultValue: string[]): string[];

    /**
     * Gets the setting value. Type of returned value is determined by type of defualt value
     * @param key 
     * @param defaultValue 
     */
    public abstract getSettingValue(key: string, defaultValue: any): any;
}