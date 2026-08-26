import * as fs from 'fs';
import { AsyncLazy } from '../../Commons/AsyncLazy';
import { Common } from '../../Commons/Common';
import { Lazy } from '../../Commons/Lazy';
import { BaseDao } from '../../DAO/BaseDao';
import { FileModel } from './FileModel';

export class SeekedFileModel extends FileModel {

    public readonly TargetDir: string;
    protected excludedFullPaths: string[];
    protected encoding: BufferEncoding = 'utf8';

    constructor(dao: BaseDao, fileNameWithExtension: string, targetDir: string, excludedFullPaths: string[]) {
        super(dao);
        this.FileNameWithExtension = fileNameWithExtension;
        this.TargetDir = targetDir;
        this.excludedFullPaths = excludedFullPaths;
    }

    //--- Override Functions ---
    public get FileName() {
        return this._fileNameAndExtension.get()[0];
    }

    public get FileExtension() {
        return this._fileNameAndExtension.get()[1];
    }
    protected _fileNameAndExtension = new Lazy(() => this.getFileNameAndExtension());

    public readonly FileNameWithExtension: string;

    public get FullPath() {
        return this.TargetDir + Common.DIR_SEPARATOR + this.FileNameWithExtension;
    }
    //--- Override Functions ---

    protected getFileNameAndExtension() {
        const fileInfos = this.FileNameWithExtension.split('.');
        // file.txt => file, txt / dir => dir
        if (fileInfos.length < 2) {
            // return directory name and empty string as extension
            const dirName = fileInfos[0];
            return [dirName, ""];
        }

        // FileNameWithExtension comes from fs.readdirSync, which yields a single entry name -
        // never a path - so there is no directory prefix here to strip off.
        const fileExtension = fileInfos[fileInfos.length -1];
        const fileName = fileInfos[fileInfos.length -2];
        // return filename and extension
        return [fileName, fileExtension];
    }

    public getContent(): Promise<string> {
        return this._content.get();
    }
    protected _content = new AsyncLazy(async () =>
        this._dao.decodeContent(await this.getBufferContent(), this.FullPath));

    /**
     * Every reading of this file that is worth searching, best first.
     *
     * Normally there is exactly one: the file as the editor reads it. With searchAllEncodings on
     * there are several, because the question changes from "what encoding is this file in" -
     * which nothing can answer for an unmarked Shift-JIS file - to "does any encoding make this
     * file contain what was searched for". The editor's own reading still comes first, so a file
     * that is marked, or configured, is answered by that rather than by a guess.
     */
    public getContentCandidates(): Promise<string[]> {
        return this._contentCandidates.get();
    }
    protected _contentCandidates = new AsyncLazy(() => this.decodeCandidates());

    protected async decodeCandidates(): Promise<string[]> {
        const asTheEditorReadsIt = await this.getContent();
        if (!this.searchAllEncodings()) {
            return [asTheEditorReadsIt];
        }

        const bytes = await this.getBufferContent();
        // Nothing in an ASCII file changes between these encodings - except UTF-16, which would
        // read its bytes pairwise and invent characters nobody is searching for.
        if (bytes.every(byte => byte < 0x80)) {
            return [asTheEditorReadsIt];
        }

        const readings = [asTheEditorReadsIt];
        for (const encoding of SeekedFileModel.SEARCHED_ENCODINGS) {
            readings.push(await this._dao.decodeContentAs(bytes, encoding));
        }
        // Encodings agree far more often than they differ - every ASCII line in a Shift-JIS file,
        // for one - and searching the same text twice can only find the same lines twice.
        return [...new Set(readings)];
    }

    /**
     * The encodings searchAllEncodings tries, in the order a match is preferred from.
     *
     * UTF-8 first because it is what a file most likely is; then UTF-16 both ways; then the two
     * Japanese encodings, which are the ones nothing in the file itself can distinguish.
     */
    protected static readonly SEARCHED_ENCODINGS = ['utf8', 'utf16le', 'utf16be', 'shiftjis', 'eucjp'];

    protected searchAllEncodings(): boolean {
        return this._searchAllEncodings.get();
    }
    protected _searchAllEncodings = new Lazy(() => this._dao.getSettingValue('searchAllEncodings', false));

    protected getBufferContent(): Promise<Buffer> {
        return this._bufferContent.get();
    }
    protected _bufferContent = new AsyncLazy(() => fs.promises.readFile(this.FullPath));

    public isExcludedFile(): boolean {
        // don't read files which have extension specified. Matched as a whole extension rather
        // than as a pattern: the setting is documented as a list of extensions, so excluding "js"
        // must not also drop every .json file, and an extension that happens to contain regexp
        // syntax ("c++") must be matched literally instead of failing to compile.
        if (this.ExcludedFileExtensions.includes(this.FileExtension.toLowerCase())) {
            return true;
        }
        // don't read result file. Compared by full path (not just basename) so a same-named
        // fixture nested in a subdirectory isn't mistaken for the actual output file.
        return this.excludedFullPaths.includes(this.FullPath);
    }
    
    public isIgnoredFileOrDirectory(): boolean {
        // skip if file extension is out of target
        if (this.isExcludedFile()) {
            return true;
        }
        // skip if hidden file or directory.
        if (this.ignoreHiddenFile() && this.FileNameWithExtension.startsWith(".")) {
            return true;
        }
        return false;
    }


    public async isFile(): Promise<boolean> {
        // Check if the file path is file or directory
        return (await this.stat())?.isFile() ?? false;
    }

    public async isDirectory(): Promise<boolean> {
        return (await this.stat())?.isDirectory() ?? false;
    }

    /**
     * What this entry actually is, or null when the filesystem will not say.
     *
     * Stat'd once per model. The walk asks every entry isDirectory and then asks it isFile, so an
     * un-cached answer meant two identical stat calls for every entry in the workspace.
     *
     * stat follows symlinks, so it rejects with ENOENT on a link whose target is gone - and that
     * error used to escape all the way out of the directory walk, which reports it as "Grep failed
     * due to an unexpected error". Because directories are recursed into before their sibling files
     * are read, one dangling link left the user with that error and an empty result file, no matter
     * how many perfectly readable files sat next to it.
     *
     * The same applies to an entry deleted between reading the directory and stat'ing it, and to
     * one this process may not stat at all. None of the three can be searched, and none is a reason
     * to abandon the rest of the workspace, so they are reported as neither file nor directory and
     * the walk steps over them. A failure is cached like any other answer, so a missing entry costs
     * one failed syscall rather than one per question asked about it.
     */
    protected stat(): Promise<fs.Stats | null> {
        return this._stat.get();
    }
    protected _stat = new AsyncLazy<fs.Stats | null>(() => this.statEntry());

    protected async statEntry(): Promise<fs.Stats | null> {
        try {
            return await fs.promises.stat(this.FullPath);
        } catch {
            return null;
        }
    }

     /**
     * Get file extensions which should be ignored when file search.
     *
     * Defaults to excluding nothing. The previous default of [''] excluded *everything*, because
     * an empty pattern matches every extension - reachable by clearing the setting in settings.json.
     */
    protected get ExcludedFileExtensions(): string[] {
        return this._excludedFileExtensions.get();
    }
    protected _excludedFileExtensions = new Lazy(
        () => SeekedFileModel.normalizeExcludedExtensions(this._dao.getSettingValue('exclude', [] as string[])));

    /**
     * The setting is declared as a list of extensions, but settings.json can hold anything, and
     * this extension used to declare the setting as a string - so a comma separated string is
     * still accepted rather than failing the whole grep on `configured.map is not a function`.
     * Extensions are compared lower case and without the decorations people write around them,
     * so "  .DLL " and "dll" mean the same thing.
     */
    protected static normalizeExcludedExtensions(configured: unknown): string[] {
        const candidates = Array.isArray(configured) ? configured
            : (typeof configured === 'string' ? configured.split(",") : []);

        return candidates
            .filter((extension): extension is string => typeof extension === 'string')
            .map(extension => extension.trim().replace(/^\./, "").toLowerCase())
            .filter(extension => extension.length > 0);
    }


    /**
     * You should ignore hidden file when file seek.
     */
    protected ignoreHiddenFile(): boolean {
        return this._ignoreHiddenFile.get();
    }
    protected _ignoreHiddenFile = new Lazy(() => this._dao.getSettingValue('ignoreHiddenFile', true));



    /**
     * Check if passed file is binary or not.
     * This is a cheap implementation to determine if passed file is binary or not.
     * This function determine passed file as binary if file contains code under the ascii 08.
     *
     * Only the leading bytes are read. This used to reach for the whole file's contents - so a
     * large binary sitting in the workspace was read into memory in full purely to look at its
     * first 512 bytes, and then thrown away unread, since the walk skips binaries.
     */
    public seemsBinary(): Promise<boolean> {
        return this._seemsBinary.get();
    }
    protected _seemsBinary = new AsyncLazy(() => this.sniffBinary());

    /**
     * Whether the leading bytes say this file is binary, reading as little as it takes to know.
     *
     * A file small enough to hold is read once and answered from what was read, so the sniff and
     * the search that follows it cost one read between them instead of one each. Those bytes are
     * kept for the search only when the file turns out to be searchable: nothing reads a binary,
     * and holding one would keep it in memory for as long as its directory is being walked.
     *
     * Anything larger still gets only its first bytes read - the whole point of not reading a
     * large binary in full is lost if the check itself does it.
     */
    protected async sniffBinary(): Promise<boolean> {
        const size = (await this.stat())?.size ?? Number.POSITIVE_INFINITY;

        if (size > SeekedFileModel.SINGLE_READ_SIZE_LIMIT) {
            return SeekedFileModel.looksBinary(await this.readHead(SeekedFileModel.BINARY_SNIFF_BYTE_COUNT));
        }

        const buffer = await fs.promises.readFile(this.FullPath);
        const binary = this.headLooksBinary(buffer.subarray(0, SeekedFileModel.BINARY_SNIFF_BYTE_COUNT));
        if (!binary) {
            this._bufferContent = AsyncLazy.resolved(buffer);
        }
        return binary;
    }

    /**
     * Unmarked UTF-16 is indistinguishable from binary by the byte test - its ASCII characters
     * are stored with a zero byte beside them - so such a file is skipped unless the search has
     * been asked to try UTF-16 anyway, which is the one case where reading it is worth the risk
     * of being wrong. A file that really is binary decodes to text nobody is searching for.
     */
    protected headLooksBinary(head: Buffer): boolean {
        if (!SeekedFileModel.looksBinary(head)) {
            return false;
        }
        return !(this.searchAllEncodings() && SeekedFileModel.looksLikeUnmarkedUtf16(head));
    }

    /**
     * Zero bytes on one consistent side of every pair, and no other control character: what text
     * in the ASCII range looks like once it is stored two bytes at a time. Text outside that
     * range - Japanese, for one - has no zero bytes at all and never reaches this test.
     */
    protected static looksLikeUnmarkedUtf16(head: Buffer): boolean {
        if (head.length < 4) {
            return false;
        }

        let zerosAtEvenPositions = 0;
        let zerosAtOddPositions = 0;
        for (let position = 0; position < head.length; position++) {
            const byte = head[position];
            if (byte === 0) {
                if (position % 2 === 0) {
                    zerosAtEvenPositions++;
                } else {
                    zerosAtOddPositions++;
                }
            } else if (byte <= SeekedFileModel.HIGHEST_BINARY_CONTROL_BYTE) {
                return false;
            }
        }

        return (zerosAtEvenPositions === 0) !== (zerosAtOddPositions === 0);
    }

    /**
     * Whether these leading bytes belong to a file nothing can search.
     *
     * A byte order mark settles it before any of the guessing below: a file that opens by saying
     * which encoding it is in is text, whatever bytes follow. UTF-16 is the case that matters -
     * half of its bytes are zero for ordinary English text, so every UTF-16 file in the workspace
     * used to be written off as binary and never searched at all.
     *
     * Without a mark the old test stands: control characters below the ASCII printable range are
     * not something text contains. That still mistakes unmarked UTF-16 for binary, which the
     * editor would also struggle to open unaided.
     */
    protected static looksBinary(head: Buffer): boolean {
        if (SeekedFileModel.startsWithByteOrderMark(head)) {
            return false;
        }
        // Every byte is 0-255, so this is the same test as the old list of [0..8].
        return head.some(byte => byte <= SeekedFileModel.HIGHEST_BINARY_CONTROL_BYTE);
    }

    protected static startsWithByteOrderMark(head: Buffer): boolean {
        return SeekedFileModel.BYTE_ORDER_MARKS.some(mark => head.subarray(0, mark.length).equals(mark));
    }

    /** UTF-8, UTF-16 little endian and UTF-16 big endian, the marks VS Code itself recognises. */
    protected static readonly BYTE_ORDER_MARKS = [
        Buffer.from([0xEF, 0xBB, 0xBF]),
        Buffer.from([0xFF, 0xFE]),
        Buffer.from([0xFE, 0xFF]),
    ];

    protected static readonly BINARY_SNIFF_BYTE_COUNT = 512;
    protected static readonly HIGHEST_BINARY_CONTROL_BYTE = 8;

    /**
     * The largest file that may be read in one go to answer the binary check. Above this the
     * bounded head read is used instead, so a large binary is never pulled into memory.
     */
    protected static readonly SINGLE_READ_SIZE_LIMIT = 1024 * 1024;

    /**
     * The first byteCount bytes of the file, or fewer when the file is shorter.
     */
    protected async readHead(byteCount: number): Promise<Buffer> {
        const buffer = Buffer.alloc(byteCount);
        const handle = await fs.promises.open(this.FullPath, 'r');
        try {
            const { bytesRead } = await handle.read(buffer, 0, byteCount, 0);
            return buffer.subarray(0, bytesRead);
        } finally {
            await handle.close();
        }
    }
}