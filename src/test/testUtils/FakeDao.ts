import { BaseDao } from '../../DAO/BaseDao';

export class FakeDao extends BaseDao {

	/**
	 * What decodeContent should pretend the editor decided, when a test wants to pin a particular
	 * encoding rather than let the stand-in below work it out.
	 */
	public forcedEncoding: string | undefined;

	/** Every file decodeContent was asked about, so a test can check what it was given. */
	public readonly decodedPaths: string[] = [];

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

	/** The editor exclusions a test wants in force. None, unless it says otherwise. */
	public editorExcludeGlobs: string[] = [];

	public getEditorExcludeGlobs(): string[] {
		return this.editorExcludeGlobs;
	}

	/**
	 * Stands in for the editor's decoding, which only exists inside the extension host.
	 *
	 * It follows the same two rules the real one starts from - honour a byte order mark and drop
	 * it, otherwise UTF-8 - which is as much as a unit test can meaningfully assert. What the
	 * editor's settings and guessing make of a file is the integration suite's business.
	 */
	public async decodeContent(content: Uint8Array, filePath: string): Promise<string> {
		this.decodedPaths.push(filePath);

		const bytes = Buffer.from(content);
		const encoding = this.forcedEncoding ?? FakeDao.encodingFromByteOrderMark(bytes) ?? 'utf-8';
		const withoutMark = bytes.subarray(FakeDao.byteOrderMarkLength(bytes));

		return new TextDecoder(encoding).decode(withoutMark);
	}

	/**
	 * The VS Code encoding ids the extension asks for, in the labels TextDecoder knows them by.
	 */
	private static readonly DECODER_LABELS: Record<string, string> = {
		utf8: 'utf-8',
		utf8bom: 'utf-8',
		utf16le: 'utf-16le',
		utf16be: 'utf-16be',
		shiftjis: 'shift_jis',
		eucjp: 'euc-jp',
	};

	public async decodeContentAs(content: Uint8Array, encoding: string): Promise<string> {
		this.decodedAs.push(encoding);
		return new TextDecoder(FakeDao.DECODER_LABELS[encoding] ?? encoding).decode(Buffer.from(content));
	}

	/** Every encoding decodeContentAs was asked for, in order. */
	public readonly decodedAs: string[] = [];

	private static encodingFromByteOrderMark(bytes: Buffer): string | undefined {
		if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) { return 'utf-8'; }
		if (bytes[0] === 0xFF && bytes[1] === 0xFE) { return 'utf-16le'; }
		if (bytes[0] === 0xFE && bytes[1] === 0xFF) { return 'utf-16be'; }
		return undefined;
	}

	private static byteOrderMarkLength(bytes: Buffer): number {
		if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) { return 3; }
		if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF)) { return 2; }
		return 0;
	}

}
