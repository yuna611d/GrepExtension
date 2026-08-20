import * as assert from 'assert';
import { ResultContentCSVModel } from '../../Models/Content/ResultContent/ResultContentCSVModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';

function newModel(outputTitle: boolean): ResultContentCSVModel {
	const dao = new FakeDao({ outputTitle });
	const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));
	model.setGrepConditionText(BASE_DIR, GREP_CONDITION);
	return model;
}

suite('ResultContentCSVModel', () => {

	test('Title is always empty (csv has no dedicated title row)', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		assert.strictEqual(model.Title, '');
	});

	test('ColumnTitle keeps the GrepConf column when outputTitle is on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'GrepConf,FilePath,lineNumber,TextLine\n');
	});

	test('ColumnTitle drops the GrepConf column when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'FilePath,lineNumber,TextLine\n');
	});

	test('getContentInOneLine embeds the grep condition (" | " joined) into every row when outputTitle is on', () => {
		const model = newModel(true);

		const line = model.getContentInOneLine('c:\\some\\file.csv', '3', 'matched text');
		assert.strictEqual(
			line,
			'Search Dir: C:\\base | Search Word: lo | RegExpMode: OFF,c:\\some\\file.csv,3,matched text\n'
		);
	});

	test('getContentInOneLine omits the grep condition when outputTitle is off', () => {
		const model = newModel(false);

		const line = model.getContentInOneLine('c:\\some\\file.csv', '3', 'matched text');
		assert.strictEqual(line, 'c:\\some\\file.csv,3,matched text\n');
	});

	suite('quoting', () => {

		test('a matched line containing the separator is wrapped in quotes', () => {
			const line = newModel(false).getContentInOneLine('c:\\file.csv', '3', 'foo(a, b)');
			assert.strictEqual(line, 'c:\\file.csv,3,"foo(a, b)"\n');
		});

		test('a double quote inside a matched line is doubled, and the field is wrapped', () => {
			const line = newModel(false).getContentInOneLine('c:\\file.csv', '3', 'say "hi"');
			assert.strictEqual(line, 'c:\\file.csv,3,"say ""hi"""\n');
		});

		test('a field with nothing special in it is written as-is', () => {
			const line = newModel(false).getContentInOneLine('c:\\file.csv', '3', 'matched text');
			assert.strictEqual(line, 'c:\\file.csv,3,matched text\n');
		});

		test('the grep condition column is quoted too when the workspace path contains a separator', () => {
			const dao = new FakeDao({ outputTitle: true });
			const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));
			model.setGrepConditionText('C:\\my,dir', GREP_CONDITION);

			const line = model.getContentInOneLine('c:\\file.csv', '3', 'matched text');
			assert.strictEqual(
				line,
				'"Search Dir: C:\\my,dir | Search Word: lo | RegExpMode: OFF",c:\\file.csv,3,matched text\n'
			);
		});

	});

	suite('extractContentAndOffset', () => {

		test('points at the matched text column of an unquoted row', () => {
			const model = newModel(false);
			const row = model.getContentInOneLine('c:\\file.csv', '3', 'matched text').replace(/\n$/, '');

			const extracted = model.extractContentAndOffset(row);
			assert.strictEqual(extracted?.text, 'matched text');
			// 'c:\file.csv' (11 chars) + ',' + '3' + ',' = 14
			assert.strictEqual(extracted?.offset, 14);
		});

		test('reads past separators that live inside a quoted field', () => {
			const model = newModel(true);
			const row = model.getContentInOneLine('c:\\file.csv', '3', 'foo(a, b)').replace(/\n$/, '');

			assert.strictEqual(model.extractContentAndOffset(row)?.text, 'foo(a, b)');
		});

		test('reads a matched line made entirely of separators', () => {
			const model = newModel(false);
			const row = model.getContentInOneLine('c:\\file.csv', '3', 'a,b,c,d,e').replace(/\n$/, '');

			assert.strictEqual(model.extractContentAndOffset(row)?.text, 'a,b,c,d,e');
		});

		// The offset is what turns a regexp match into a decoration range, so it has to index the
		// row exactly as written to the document - not the value it had before quoting.
		const RENDERED_ROW_CASES = ['matched text', 'foo(a, b)', 'say "hi"', 'a,b,c', '"Lorem ipsum, '];
		for (const text of RENDERED_ROW_CASES) {
			for (const outputTitle of [true, false]) {
				test(`text and offset address the rendered row for ${JSON.stringify(text)} (outputTitle: ${outputTitle})`, () => {
					const model = newModel(outputTitle);
					const row = model.getContentInOneLine('c:\\file.csv', '3', text).replace(/\n$/, '');

					const extracted = model.extractContentAndOffset(row);
					assert.ok(extracted !== null);
					assert.strictEqual(row.slice(extracted.offset, extracted.offset + extracted.text.length), extracted.text);
				});
			}
		}

	});

});
