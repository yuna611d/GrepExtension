import * as assert from 'assert';
import * as vscode from 'vscode';
import { GrepService } from '../../Services/GrepService';
import { DecorationService } from '../../Services/DecorationService';
import { DirectoryWalker, NumberedFileLine } from '../../Services/DirectoryWalker';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { ResultContentModel } from '../../Models/Content/ResultContent/ResultContentModel';
import { CancellationError, TimeKeeper } from '../../Models/TimeKeeper';
import { FakeDao } from '../testUtils/FakeDao';

// doService()/flushPendingMatches() drive a live vscode.TextEditor (via
// ResultFileModel.insertText/insertTextBlock) and are already covered end-to-end by the
// integration suites in extension.test.ts. This suite covers the parts that are pure logic and
// don't need an editor: prepareGrep(), getFindWordRange(), and how findWordInAFile()/grep()
// handle cancellation (exercised with searches that match nothing, so nothing is ever written).
class TestableGrepService extends GrepService {
	public flushCalls = 0;

	public callPrepareGrep(): boolean {
		return this.prepareGrep();
	}
	public callGetFindWordRange(re: RegExp, targetString: string, lineNumber: number, searchStartPos: number): vscode.Range | null {
		return this.getFindWordRange(re, targetString, lineNumber, searchStartPos);
	}
	public callFindWordInAFile(...readings: NumberedFileLine[][]): Promise<void> {
		return this.findWordInAFile(readings);
	}
	public getResultContent(): ResultContentModel {
		return this.resultContent;
	}
	public getPendingMatches(): NumberedFileLine[] {
		return this.pendingMatches;
	}
	public useWalker(walker: DirectoryWalker): void {
		this.directoryWalker = walker;
	}
	public useResultContent(content: ResultContentModel): void {
		this.resultContent = content;
	}
	public notSavedWarnings = 0;
	protected showNotSavedWarning(): void {
		this.notSavedWarnings++;
	}
	public callPrepareOptionalService(editor: vscode.TextEditor): void {
		this.prepareOptionalService(editor);
	}
	protected async flushPendingMatches(): Promise<void> {
		this.flushCalls++;
	}
}

// Counts how often the service asks about cancellation, and optionally always answers "cancelled".
class SpyTimeKeeper extends TimeKeeper {
	public checks = 0;

	constructor(private readonly cancelled = false) {
		super();
	}

	public throwErrorIfCancelled(): void {
		this.checks++;
		if (this.cancelled) {
			throw new CancellationError();
		}
	}
}

class ThrowingDirectoryWalker extends DirectoryWalker {
	public async walk(): Promise<void> {
		throw new CancellationError();
	}
}

function newService(searchWord: string | undefined, outputTitle = true, timeKeeper: TimeKeeper = new TimeKeeper()): TestableGrepService {
	const dao = new FakeDao({ exclude: [], outputTitle });
	const resultFile = new ResultFileModel(dao);
	return new TestableGrepService(resultFile, searchWord, new DecorationService(), timeKeeper);
}

// Records when the file is asked to save, so the order against the format's footer is visible.
class RecordingResultFileModel extends ResultFileModel {
	public saveCalls = 0;

	constructor(dao: FakeDao, private readonly log: string[], private readonly saved = true) {
		super(dao);
	}

	public async save(): Promise<boolean> {
		this.saveCalls++;
		this.log.push('save');
		return this.saved;
	}
}

// A format whose footer records itself, standing in for json's closing bracket.
class FooterRecordingContentModel extends ResultContentModel {
	constructor(dao: FakeDao, private readonly log: string[]) {
		super(dao, {} as ResultFileModel);
	}

	public async addFooter(): Promise<void> {
		this.log.push('footer');
	}
}

function serviceWritingTo(log: string[], walker: DirectoryWalker, saved = true): TestableGrepService {
	const dao = new FakeDao({ exclude: [], outputTitle: true });
	const service = new TestableGrepService(
		new RecordingResultFileModel(dao, log, saved), 'lo', new DecorationService(), new TimeKeeper());
	service.useWalker(walker);
	service.useResultContent(new FooterRecordingContentModel(dao, log));
	return service;
}

// Records what a search asks of the highlighting, without needing a live editor.
class RecordingDecorationService extends DecorationService {
	public readonly calls: string[] = [];

	public clear(): RecordingDecorationService {
		this.calls.push('clear');
		return this;
	}

	public setEditor(editor: vscode.TextEditor): RecordingDecorationService {
		this.calls.push('setEditor');
		super.setEditor(editor);
		return this;
	}
}

// Runs the real flushPendingMatches() - and so the real decoration bookkeeping - with only the
// one editor round-trip inside it replaced, and records everything the highlighting is handed.
class LineCountingContentModel extends ResultContentModel {
	private nextLine = 0;

	constructor(dao: FakeDao) {
		super(dao, {} as ResultFileModel);
	}

	protected async insertContentBlock(formattedContents: string[]): Promise<number> {
		const firstLine = this.nextLine;
		this.nextLine += formattedContents.length;
		return firstLine;
	}
}

class HighlightRecordingGrepService extends GrepService {
	/** The size of the set handed to the editor, one entry per update. */
	public readonly updateSizes: number[] = [];

	constructor(dao: FakeDao) {
		super(new ResultFileModel(dao), 'lo', new DecorationService(), new TimeKeeper());
		this.resultContent = new LineCountingContentModel(dao);
		this.optionalService.setEditor({
			setDecorations: (_type: vscode.TextEditorDecorationType, ranges: readonly vscode.Range[]) => {
				this.updateSizes.push(ranges.length);
			},
		} as unknown as vscode.TextEditor);
	}

	/** Feed the service one matching line at a time, as the walk does, then flush the remainder. */
	public async findMatches(count: number): Promise<void> {
		for (let i = 0; i < count; i++) {
			await this.findWordInAFile([[{ filePath: '/root/a.txt', lineText: 'hello', lineNumber: i + 1 }]]);
		}
		await this.flushPendingMatches();
	}

	public finish(): void {
		this.showDecorations();
	}

	public useWalker(walker: DirectoryWalker): void {
		this.directoryWalker = walker;
	}

	/** Writing the file needs a live editor and is covered elsewhere; this suite is highlighting. */
	protected async persistResult(): Promise<void> {}

	public get rangesFound(): number {
		return this.allRanges.length;
	}

	/** Total range objects the editor was handed across every update. */
	public get rangesHandedOver(): number {
		return this.updateSizes.reduce((total, size) => total + size, 0);
	}
}

// Records whether the result file was ever created, so a search that cannot run can be shown to
// leave nothing behind.
class CreationRecordingResultFileModel extends ResultFileModel {
	public creations = 0;

	public async addNewFile(): Promise<CreationRecordingResultFileModel> {
		this.creations++;
		return this;
	}
}

class SilentDirectoryWalker extends DirectoryWalker {
	public async walk(): Promise<void> {}
}

// Remembers what the search asked it to leave alone.
class ExclusionRecordingDirectoryWalker extends DirectoryWalker {
	public excluded: string[] = [];

	public async walk(_targetDir: string, excludedFullPaths: string[]): Promise<void> {
		this.excluded = excludedFullPaths;
	}
}

class FailingDirectoryWalker extends DirectoryWalker {
	public async walk(): Promise<void> {
		throw new Error('disk went away');
	}
}

function lines(...texts: string[]): NumberedFileLine[] {
	return texts.map((lineText, i) => ({ filePath: '/root/a.txt', lineText, lineNumber: i + 1 }));
}

suite('GrepService', () => {

	suite('prepareGrep', () => {

		test('returns false and leaves the grep condition unset for an empty search word', () => {
			const service = newService(undefined);
			assert.strictEqual(service.callPrepareGrep(), false);
			assert.strictEqual(service.getResultContent().Title, '');
		});

		test('returns true and records the grep condition for a valid search word', () => {
			const service = newService('lo');
			assert.strictEqual(service.callPrepareGrep(), true);
			const title = service.getResultContent().Title;
			assert.ok(title.includes('Search Word: lo'));
			assert.ok(title.includes('RegExpMode: OFF'));
		});

		test('records RegExpMode: ON for a re/.../ search word', () => {
			const service = newService('re/lo.*it/');
			service.callPrepareGrep();
			assert.ok(service.getResultContent().Title.includes('RegExpMode: ON'));
		});

	});

	suite('getFindWordRange', () => {

		test('returns a Range covering the match, offset by searchStartPos', () => {
			const service = newService('lo');
			const range = service.callGetFindWordRange(/lo/i, 'xxlorem', 3, 10);
			assert.ok(range !== null);
			assert.strictEqual(range.start.line, 3);
			assert.strictEqual(range.end.line, 3);
			// "lo" is found at index 2 within "xxlorem", so absolute column = 10 + 2 = 12.
			assert.strictEqual(range.start.character, 12);
			assert.strictEqual(range.end.character, 14);
		});

		test('returns null when there is no match', () => {
			const service = newService('lo');
			const range = service.callGetFindWordRange(/zzz/i, 'xxlorem', 0, 0);
			assert.strictEqual(range, null);
		});

		test('resets lastIndex before each call, so a global regex is reusable across lines', () => {
			const service = newService('lo');
			const globalRe = /lo/gi;

			const first = service.callGetFindWordRange(globalRe, 'lorem', 0, 0);
			const second = service.callGetFindWordRange(globalRe, 'lorem', 1, 0);

			assert.ok(first !== null && second !== null);
			assert.strictEqual(first.start.character, second.start.character);
		});

	});

	suite('highlighting', () => {

		test('a search takes back the previous search\'s highlights before it starts', () => {
			const dao = new FakeDao({ exclude: [], outputTitle: true });
			const decoration = new RecordingDecorationService();
			const service = new TestableGrepService(new ResultFileModel(dao), 'lo', decoration, new TimeKeeper());

			service.callPrepareOptionalService({} as vscode.TextEditor);

			// A search that finds nothing never reaches a flush, so without this the last
			// search's highlights would simply stay on screen.
			assert.deepStrictEqual(decoration.calls, ['setEditor', 'clear']);
		});

		test('shows the highlights on every batch while the set is still small', async () => {
			const service = new HighlightRecordingGrepService(new FakeDao({ exclude: [], outputTitle: true }));

			await service.findMatches(120);

			// Sending a small set costs almost nothing, and updating each time is what makes the
			// highlights appear alongside the results as they are written.
			assert.deepStrictEqual(service.updateSizes, [40, 80, 120]);
		});

		test('stops handing the whole set over on every batch as it grows', async () => {
			const service = new HighlightRecordingGrepService(new FakeDao({ exclude: [], outputTitle: true }));

			await service.findMatches(20000);
			service.finish();

			// setDecorations replaces every decoration of its type, so each update carries the
			// whole accumulated set. Updating once per 40-match batch therefore made the total
			// work grow with the square of the matches found: 500 updates carrying 5,010,000
			// ranges between them, 250 times the 20,000 actually found.
			assert.strictEqual(service.rangesFound, 20000);
			assert.ok(service.updateSizes.length < 40,
				`updated ${service.updateSizes.length} times, which is not far below the 500 batches`);
			assert.ok(service.rangesHandedOver < 20000 * 5,
				`handed over ${service.rangesHandedOver} ranges for 20000 matches`);
		});

		test('the set handed over grows no faster than the matches found', async () => {
			const perMatch = async (matches: number) => {
				const service = new HighlightRecordingGrepService(new FakeDao({ exclude: [], outputTitle: true }));
				await service.findMatches(matches);
				service.finish();
				return service.rangesHandedOver / matches;
			};

			// The cost per match is what used to climb - 13x at 1,000 matches, 251x at 20,000.
			// Ten times the matches must not mean ten times the cost of each one.
			const small = await perMatch(2000);
			const large = await perMatch(20000);

			assert.ok(large < small * 2, `${small.toFixed(1)}x per match at 2,000, ${large.toFixed(1)}x at 20,000`);
		});

		test('the highlights left on screen are every match, not the set at the last update', async () => {
			const service = new HighlightRecordingGrepService(new FakeDao({ exclude: [], outputTitle: true }));

			await service.findMatches(5000);
			// What grep() does once the search is over, however it ended.
			service.finish();

			// Skipping an update is only ever a delay: the reader must still end up looking at
			// every match that was found.
			assert.strictEqual(service.updateSizes[service.updateSizes.length - 1], 5000);
		});

		test('a grep shows the complete set even when it is cancelled', async () => {
			const dao = new FakeDao({ exclude: [], outputTitle: true });
			const service = new HighlightRecordingGrepService(dao);
			service.useWalker(new ThrowingDirectoryWalker());
			await service.findMatches(300);
			const shownDuringTheSearch = service.updateSizes.length;

			await service.grep();

			// grep() ends by showing everything, so a cancelled or failed search leaves the
			// matches it did find highlighted rather than an older, shorter set.
			assert.ok(service.updateSizes.length > shownDuringTheSearch);
			assert.strictEqual(service.updateSizes[service.updateSizes.length - 1], 300);
		});

	});

	suite('what a search leaves alone', () => {

		test('every format\'s result file is skipped, not only the one being written', async () => {
			const dao = new FakeDao({ exclude: [], outputTitle: true, outputContentFormat: 'csv' });
			const resultFile = new ResultFileModel(dao);
			const service = new TestableGrepService(resultFile, 'lo', new DecorationService(), new TimeKeeper());
			const walker = new ExclusionRecordingDirectoryWalker();
			service.useWalker(walker);

			await service.grep();

			// Switching outputContentFormat leaves the previous format's file in the workspace,
			// and a search that does not skip it reports its own earlier results as matches.
			assert.deepStrictEqual(walker.excluded, resultFile.AllFormatFullPaths);
			assert.ok(walker.excluded.includes(resultFile.FullPath));
		});

	});

	suite('a search that cannot run', () => {

		test('creates no result file for an empty search word', async () => {
			const dao = new FakeDao({ exclude: [], outputTitle: true });
			const resultFile = new CreationRecordingResultFileModel(dao);
			const service = new TestableGrepService(resultFile, '', new DecorationService(), new TimeKeeper());

			await service.doService();

			// The file used to be created before the word was checked, so backing out of a search
			// still left an empty result file sitting in the workspace.
			assert.strictEqual(resultFile.creations, 0);
		});

		// That the file is still created for a word that can be searched for is what every
		// golden-fixture suite in extension.test.ts depends on, so it is checked there rather
		// than here - doService() needs a live editor once it gets past this point.

	});

	suite('writing the result to the file', () => {

		test('a finished grep writes the file, after the format has closed it', async () => {
			const log: string[] = [];
			const service = serviceWritingTo(log, new SilentDirectoryWalker());

			await service.grep();

			// Saving before the footer would put an incomplete document on disk - json's closing
			// bracket arrives with the footer.
			assert.deepStrictEqual(log, ['footer', 'save']);
		});

		test('a cancelled grep writes what it had found', async () => {
			const log: string[] = [];
			const service = serviceWritingTo(log, new ThrowingDirectoryWalker());

			await service.grep();

			assert.deepStrictEqual(log, ['footer', 'save']);
		});

		test('a failed grep still writes what it had found', async () => {
			const log: string[] = [];
			const service = serviceWritingTo(log, new FailingDirectoryWalker());

			await service.grep();

			// Whatever went wrong, the matches found before it are worth keeping.
			assert.deepStrictEqual(log, ['footer', 'save']);
		});

		test('a refused save is reported rather than passed over', async () => {
			const log: string[] = [];
			const service = serviceWritingTo(log, new SilentDirectoryWalker(), false);

			await service.grep();

			// The point of the change is that the file holds the result; when it cannot, saying
			// so is the difference between the user keeping their results and losing them.
			assert.strictEqual(service.notSavedWarnings, 1);
		});

		test('a save that worked says nothing', async () => {
			const log: string[] = [];
			const service = serviceWritingTo(log, new SilentDirectoryWalker());

			await service.grep();

			assert.strictEqual(service.notSavedWarnings, 0);
		});

	});

	suite('choosing between readings of one file', () => {

		// With searchAllEncodings on, a file arrives decoded several ways and only one of those
		// readings is the file. Which one is not knowable until something matches in it.
		test('a file read one way is searched as it always was', async () => {
			const service = newService('lo');

			await service.callFindWordInAFile(lines('lorem', 'ipsum'));

			assert.deepStrictEqual(service.getPendingMatches().map(m => m.lineText), ['lorem']);
		});

		test('a later reading is searched when the earlier ones find nothing', async () => {
			const service = newService('lo');

			await service.callFindWordInAFile(lines('mojibake'), lines('lorem'));

			assert.deepStrictEqual(service.getPendingMatches().map(m => m.lineText), ['lorem']);
		});

		test('the first reading that finds anything is the only one reported', async () => {
			const service = newService('lo');

			// Both readings match here. Reporting the file through both would show the same lines
			// twice, once as mojibake - a file is one file, whichever encoding revealed it.
			await service.callFindWordInAFile(lines('lorem'), lines('lorem too'));

			assert.deepStrictEqual(service.getPendingMatches().map(m => m.lineText), ['lorem']);
		});

		test('nothing is reported when no reading finds anything', async () => {
			const service = newService('lo');

			await service.callFindWordInAFile(lines('nothing here'), lines('still nothing'));

			assert.deepStrictEqual(service.getPendingMatches(), []);
		});

	});

	suite('cancellation', () => {

		test('checks for cancellation after every file, even one with no matches', async () => {
			const timeKeeper = new SpyTimeKeeper();
			const service = newService('lo', true, timeKeeper);

			await service.callFindWordInAFile(lines('nothing to see here'));
			await service.callFindWordInAFile(lines('still nothing'));

			// One check per file walked. Before, the check lived in flushPendingMatches(), which a
			// match-free search never reaches - so a long grep with no hits could not be cancelled.
			assert.strictEqual(timeKeeper.checks, 2);
		});

		test('a file with no matches still propagates the cancellation', async () => {
			const service = newService('lo', true, new SpyTimeKeeper(true));

			await assert.rejects(
				() => service.callFindWordInAFile(lines('nothing to see here')),
				CancellationError
			);
		});

		test('grep() flushes the partial batch when it is cancelled, so found matches are kept', async () => {
			const service = newService('lo');
			service.useWalker(new ThrowingDirectoryWalker());

			await service.grep();

			// The walk threw before grep()'s own flush, so the only flush is the one in the
			// cancellation branch - without it, up to BATCH_SIZE-1 buffered matches are lost.
			assert.strictEqual(service.flushCalls, 1);
		});

	});

});
