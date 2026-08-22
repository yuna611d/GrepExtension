import * as assert from 'assert';
import { ResultContentModel } from '../../Models/Content/ResultContent/ResultContentModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';

suite('ResultContentModel (txt)', () => {

	test('Title contains the grep condition when outputTitle is on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		assert.strictEqual(
			model.Title,
			['Search Dir: C:\\base', 'Search Word: lo', 'RegExpMode: OFF'].join('\n')
		);
	});

	test('Title is empty when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		assert.strictEqual(model.Title, '');
	});

	test('columnPosition shifts by one when the title row is suppressed', () => {
		const withTitle = new ResultContentModel(new FakeDao({ outputTitle: true }), new ResultFileModel(new FakeDao()));
		assert.deepStrictEqual(withTitle.columnPosition, { title: 0, filePath: 1, lineNumber: 2, content: 3 });

		const withoutTitle = new ResultContentModel(new FakeDao({ outputTitle: false }), new ResultFileModel(new FakeDao()));
		assert.deepStrictEqual(withoutTitle.columnPosition, { title: 0, filePath: 0, lineNumber: 1, content: 2 });
	});

	test('ColumnTitle always blanks the first (GrepConf) column for txt output', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, '\tFilePath\tlineNumber\tTextLine\n');
	});

	test('getContentInOneLine never embeds the grep condition (unlike csv/tsv)', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const line = model.getContentInOneLine('c:\\some\\file.txt', '3', 'matched text');
		assert.strictEqual(line, '\tc:\\some\\file.txt\t3\tmatched text\n');
	});

	test('txt appends to a previous result, keeping a running log of searches', () => {
		const dao = new FakeDao({ outputTitle: true });

		assert.strictEqual(new ResultContentModel(dao, new ResultFileModel(dao)).appendsToPreviousResult, true);
	});

	test('extractContentAndOffset locates the content column and its character offset', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));

		// A row built the same way getContentInOneLine('f', '3', 'X') would (grep-condition column blanked).
		const extracted = model.extractContentAndOffset('\tf\t3\tX');
		assert.deepStrictEqual(extracted, { text: 'X', offset: 5 });
	});

	test('extractContentAndOffset returns an empty text when the line has fewer columns than expected', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));

		const extracted = model.extractContentAndOffset('too\tshort');
		assert.strictEqual(extracted?.text, '');
	});

});
