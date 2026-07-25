import * as assert from 'assert';
import { ResultContentCSVModel } from '../../Models/Content/ResultContent/ResultContentCSVModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';

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

		assert.strictEqual(model.ColumnTitle, 'GrepConf,FilePath,lineNumber,TextLine');
	});

	test('ColumnTitle drops the GrepConf column when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'FilePath,lineNumber,TextLine');
	});

	test('getContentInOneLine embeds the grep condition (" | " joined) into every row when outputTitle is on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const line = model.getContentInOneLine('c:\\some\\file.csv', '3', 'matched text');
		assert.strictEqual(
			line,
			'Search Dir: C:\\base | Search Word: lo | RegExpMode: OFF,c:\\some\\file.csv,3,matched text'
		);
	});

	test('getContentInOneLine omits the grep condition when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentCSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const line = model.getContentInOneLine('c:\\some\\file.csv', '3', 'matched text');
		assert.strictEqual(line, 'c:\\some\\file.csv,3,matched text');
	});

});
