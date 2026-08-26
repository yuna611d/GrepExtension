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
