import { BaseDao } from '../../DAO/BaseDao';

export class FakeDao extends BaseDao {

	constructor(private readonly settings: Record<string, string | string[] | boolean> = {}) {
		super();
	}

	public getSettingValue(key: string, defaultValue: string): string;
	public getSettingValue(key: string, defaultValue: string[]): string[];
	public getSettingValue(key: string, defaultValue: boolean): boolean;
	public getSettingValue<T>(key: string, defaultValue: T): T {
		return Object.prototype.hasOwnProperty.call(this.settings, key)
			? this.settings[key] as unknown as T
			: defaultValue;
	}

}
