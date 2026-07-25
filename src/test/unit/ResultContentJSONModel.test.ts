import * as assert from 'assert';
import { ResultContentJSONModel } from '../../Models/Content/ResultContent/ResultContentJSONModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

const GREP_CONDITION = { searchWord: 'lo', isRegExpMode: false };
const BASE_DIR = 'C:\\base';
// Mirrors the fixed closing text ResultContentJSONModel.addFooter() inserts via the (editor-dependent)
// ResultFileModel; asserted here without needing a live vscode.TextEditor.
const FOOTER = '\n]';

suite('ResultContentJSONModel', () => {

	test('produces a syntactically valid JSON array once concatenated and closed, with outputTitle on', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentJSONModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const output = model.Title
			+ model.ColumnTitle
			+ model.getContentInOneLine('c:\\some\\file.json', '3', 'matched text')
			+ model.getContentInOneLine('c:\\some\\other.json', '7', 'more text')
			+ FOOTER;

		const parsed = JSON.parse(output);
		assert.strictEqual(Array.isArray(parsed), true);
		assert.strictEqual(parsed.length, 3);
		assert.deepStrictEqual(parsed[0], {
			grepCondition: ['Search Dir: C:\\base', 'Search Word: lo', 'RegExpMode: OFF'],
		});
		assert.deepStrictEqual(parsed[1], { filePath: 'c:\\some\\file.json', lineNumber: 3, text: 'matched text' });
		assert.deepStrictEqual(parsed[2], { filePath: 'c:\\some\\other.json', lineNumber: 7, text: 'more text' });
	});

	test('produces a syntactically valid JSON array with outputTitle off (no condition element)', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentJSONModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const output = model.Title
			+ model.ColumnTitle
			+ model.getContentInOneLine('c:\\some\\file.json', '3', 'matched text')
			+ FOOTER;

		const parsed = JSON.parse(output);
		assert.deepStrictEqual(parsed, [{ filePath: 'c:\\some\\file.json', lineNumber: 3, text: 'matched text' }]);
	});

	test('produces a syntactically valid (empty) JSON array when no matches are found', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentJSONModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText(BASE_DIR, GREP_CONDITION);

		const output = model.Title + model.ColumnTitle + FOOTER;

		assert.deepStrictEqual(JSON.parse(output), []);
	});

	test('extractContentAndOffset always returns null (decoration is disabled for json output)', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentJSONModel(dao, new ResultFileModel(dao));

		assert.strictEqual(model.extractContentAndOffset('{"filePath":"x","lineNumber":1,"text":"lo"}'), null);
	});

});
