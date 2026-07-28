import * as assert from 'assert';
import * as vscode from 'vscode';
import { GrepService } from '../../Services/GrepService';
import { DecorationService } from '../../Services/DecorationService';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { ResultContentModel } from '../../Models/Content/ResultContent/ResultContentModel';
import { FakeDao } from '../testUtils/FakeDao';

// doService()/grep()/findWordInAFile()/flushPendingMatches() all drive a live vscode.TextEditor
// (via ResultFileModel.insertText/insertTextBlock) and are already covered end-to-end by the
// integration suites in extension.test.ts. This suite covers the two protected methods that are
// pure logic and don't need an editor: prepareGrep() and getFindWordRange().
class TestableGrepService extends GrepService {
	public callPrepareGrep(): boolean {
		return this.prepareGrep();
	}
	public callGetFindWordRange(re: RegExp, targetString: string, lineNumber: number, searchStartPos: number): vscode.Range | null {
		return this.getFindWordRange(re, targetString, lineNumber, searchStartPos);
	}
	public getResultContent(): ResultContentModel {
		return this.resultContent;
	}
}

function newService(searchWord: string | undefined, outputTitle = true): TestableGrepService {
	const dao = new FakeDao({ exclude: [], outputTitle });
	const resultFile = new ResultFileModel(dao);
	return new TestableGrepService(resultFile, searchWord, new DecorationService());
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

});
