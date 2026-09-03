export abstract class BaseDao {
    public abstract getSettingValue(key: string, defaultValue: boolean): boolean;
    public abstract getSettingValue(key: string, defaultValue: string): string;
    public abstract getSettingValue(key: string, defaultValue: string[]): string[];

    /**
     * Gets the setting value. Type of returned value is determined by type of default value
     * @param key 
     * @param defaultValue 
     */
    public abstract getSettingValue<T>(key: string, defaultValue: T): T;

    /**
     * The globs the editor has been told to leave out of a search: `files.exclude` together with
     * `search.exclude`, which is how VS Code itself decides what its own search covers.
     *
     * Asked of the DAO rather than read directly because they are the editor's settings, not this
     * extension's - the same reason decoding goes through here.
     */
    public abstract getEditorExcludeGlobs(): string[];

    /**
     * Turns the bytes of a file into the text to search.
     *
     * Which encoding those bytes are in is not something the extension decides: the editor
     * already answers it, from the file's byte order mark and from the `files.encoding` settings
     * that apply to it. Going through the editor is what keeps a search agreeing with what the
     * file looks like when it is opened.
     *
     * @param content The file's bytes, all of them - an encoding cannot be applied to a fragment.
     * @param filePath The file those bytes came from, which is what the per-file and per-language
     *                 encoding settings are keyed on.
     */
    public abstract decodeContent(content: Uint8Array, filePath: string): Promise<string>;

    /**
     * Turns the bytes of a file into text using the encoding named, whatever the settings say.
     *
     * This is how a search can look at one file through several encodings in turn, which is a
     * question the settings cannot answer: they describe what a file *is*, and this asks what it
     * would say if it were something else.
     *
     * @param content The file's bytes, all of them.
     * @param encoding A VS Code encoding id, such as 'utf8', 'utf16le', 'shiftjis' or 'eucjp'.
     */
    public abstract decodeContentAs(content: Uint8Array, encoding: string): Promise<string>;
}