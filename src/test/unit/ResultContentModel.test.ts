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

	test('columnPosition does not shift when the title row is suppressed', () => {
		// txt blanks the grep-condition column and keeps it, so its data columns never move -
		// unlike csv and tsv, which drop the field outright and really do shift left by one.
		// Shifting txt's along with theirs pointed the content column at the line number.
		const withTitle = new ResultContentModel(new FakeDao({ outputTitle: true }), {} as ResultFileModel);
		assert.deepStrictEqual(withTitle.columnPosition, { title: 0, filePath: 1, lineNumber: 2, content: 3 });

		const withoutTitle = new ResultContentModel(new FakeDao({ outputTitle: false }), {} as ResultFileModel);
		assert.deepStrictEqual(withoutTitle.columnPosition, { title: 0, filePath: 1, lineNumber: 2, content: 3 });
	});

	test('a row written with the title suppressed still yields its matched text', () => {
		const dao = new FakeDao({ outputTitle: false });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText('/ws', { searchWord: 'needle', isRegExpMode: false });

		const row = model.getContentInOneLine('/ws/a.txt', '42', 'the needle is here').replace(/\n$/, '');
		const extracted = model.extractContentAndOffset(row);

		// This used to hand back "42": the word was looked for in the line number and never found,
		// so nothing was highlighted - and searching for a number highlighted the line number.
		assert.strictEqual(extracted?.text, 'the needle is here');
		assert.strictEqual(row.slice(extracted!.offset), 'the needle is here');
	});

	test('a row written with the title shown yields its matched text too', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText('/ws', { searchWord: 'needle', isRegExpMode: false });

		const row = model.getContentInOneLine('/ws/a.txt', '42', 'the needle is here').replace(/\n$/, '');
		const extracted = model.extractContentAndOffset(row);

		assert.strictEqual(extracted?.text, 'the needle is here');
		assert.strictEqual(row.slice(extracted!.offset), 'the needle is here');
	});

	// The content column holds a line of somebody's source file, which is free to contain a tab -
	// the separator txt writes its own columns with. Reading only as far as the next separator cut
	// the line at the first one, so a tab-indented line yielded "" and its match was never found
	// again: the row was written to the result with no highlight on it at all.
	test('a tab-indented line keeps all of its text', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText('/ws', { searchWord: 'needle', isRegExpMode: false });

		const row = model.getContentInOneLine('/ws/a.go', '42', '\t\tif (needle) { }').replace(/\n$/, '');
		const extracted = model.extractContentAndOffset(row);

		assert.strictEqual(extracted?.text, '\t\tif (needle) { }');
		assert.strictEqual(row.slice(extracted!.offset), '\t\tif (needle) { }');
	});

	test('a tab in the middle of a line keeps the text after it', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText('/ws', { searchWord: 'needle', isRegExpMode: false });

		const row = model.getContentInOneLine('/ws/a.txt', '42', 'const x = 1;\tneedle here').replace(/\n$/, '');
		const extracted = model.extractContentAndOffset(row);

		assert.strictEqual(extracted?.text, 'const x = 1;\tneedle here');
	});

	// The offset is what a decoration range is measured from, so it has to keep pointing at the
	// first character of the content column however many separators the line itself contains.
	test('the offset still points at the start of the content column', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));
		model.setGrepConditionText('/ws', { searchWord: 'needle', isRegExpMode: false });

		const row = model.getContentInOneLine('/ws/a.go', '42', '\tneedle').replace(/\n$/, '');
		const extracted = model.extractContentAndOffset(row);

		assert.strictEqual(extracted!.offset, '\t/ws/a.go\t42\t'.length);
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

	test('a row one column short yields an empty text, not the undefined past its end', () => {
		const dao = new FakeDao({ outputTitle: true });
		const model = new ResultContentModel(dao, new ResultFileModel(dao));

		// Three fields, so index 3 is one past the end. The guard admitted this row and handed
		// back what reading past the end gives - undefined, typed as a string - which a search
		// word was then matched against: "def" and "fine" both find themselves in "undefined".
		const extracted = model.extractContentAndOffset('\tf\t3');

		assert.strictEqual(extracted?.text, '');
		assert.strictEqual(typeof extracted?.text, 'string');
	});

});
