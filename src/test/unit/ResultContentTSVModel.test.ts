import * as assert from 'assert';
import { ResultContentTSVModel } from '../../Models/Content/ResultContent/ResultContentTSVModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';

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

		assert.strictEqual(model.ColumnTitle, 'GrepConf\tFilePath\tlineNumber\tTextLine');
	});

	test('ColumnTitle drops the GrepConf column when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.ColumnTitle, 'FilePath\tlineNumber\tTextLine');
	});

	test('getContentInOneLine embeds the grep condition (" | " joined) into every row when outputTitle is on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const line = model.getContentInOneLine('c:\\some\\file.tsv', '3', 'matched text');
		assert.strictEqual(
			line,
			'Search Dir: C:\\base | Search Word: lo | RegExpMode: OFF\tc:\\some\\file.tsv\t3\tmatched text'
		);
	});

	test('getContentInOneLine omits the grep condition when outputTitle is off', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentTSVModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const line = model.getContentInOneLine('c:\\some\\file.tsv', '3', 'matched text');
		assert.strictEqual(line, 'c:\\some\\file.tsv\t3\tmatched text');
	});

});
