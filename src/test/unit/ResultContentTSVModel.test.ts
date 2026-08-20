import * as assert from 'assert';
import { ResultContentTSVModel } from '../../Models/Content/ResultContent/ResultContentTSVModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';

function newModel(outputTitle: boolean): ResultContentTSVModel {
	const dao = new FakeDao({ outputTitle });
	const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));
	model.setGrepConditionText(BASE_DIR, GREP_CONDITION);
	return model;
}

suite('ResultContentTSVModel', () => {

	test('Title is always empty (tsv has no dedicated title row)', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		assert.strictEqual(model.Title, '');
	});

	test('ColumnTitle keeps the GrepConf column when outputTitle is on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'GrepConf\tFilePath\tlineNumber\tTextLine\n');
	});

	test('ColumnTitle drops the GrepConf column when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'FilePath\tlineNumber\tTextLine\n');
	});

	test('getContentInOneLine embeds the grep condition (" | " joined) into every row when outputTitle is on', () => {
		const model = newModel(true);

		const line = model.getContentInOneLine('c:\\some\\file.tsv', '3', 'matched text');
		assert.strictEqual(
			line,
			'Search Dir: C:\\base | Search Word: lo | RegExpMode: OFF\tc:\\some\\file.tsv\t3\tmatched text\n'
		);
	});

	test('getContentInOneLine omits the grep condition when outputTitle is off', () => {
		const model = newModel(false);

		const line = model.getContentInOneLine('c:\\some\\file.tsv', '3', 'matched text');
		assert.strictEqual(line, 'c:\\some\\file.tsv\t3\tmatched text\n');
	});

	suite('quoting', () => {

		test('a matched line containing a tab is wrapped in quotes', () => {
			const line = newModel(false).getContentInOneLine('c:\\file.tsv', '3', 'a\tb');
			assert.strictEqual(line, 'c:\\file.tsv\t3\t"a\tb"\n');
		});

		test('a double quote inside a matched line is doubled, and the field is wrapped', () => {
			// A bare double quote opens a quoted field for every reader that honours the default
			// quote character (Excel, pandas, python's csv), swallowing the rows that follow it.
			const line = newModel(false).getContentInOneLine('c:\\file.tsv', '3', '"Lorem ipsum');
			assert.strictEqual(line, 'c:\\file.tsv\t3\t"""Lorem ipsum"\n');
		});

		test('a comma needs no quoting in tsv, where it is not the separator', () => {
			const line = newModel(false).getContentInOneLine('c:\\file.tsv', '3', 'foo(a, b)');
			assert.strictEqual(line, 'c:\\file.tsv\t3\tfoo(a, b)\n');
		});

		test('extractContentAndOffset reads past tabs inside a quoted field', () => {
			const model = newModel(true);
			const row = model.getContentInOneLine('c:\\file.tsv', '3', 'a\tb').replace(/\n$/, '');

			const extracted = model.extractContentAndOffset(row);
			assert.ok(extracted !== null);
			assert.strictEqual(extracted.text, 'a\tb');
			assert.strictEqual(row.slice(extracted.offset, extracted.offset + extracted.text.length), extracted.text);
		});

	});

});
