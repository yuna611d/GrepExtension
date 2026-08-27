import * as assert from 'assert';
import * as fs from 'fs';
import { Common } from '../../Commons/Common';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';
import * as vscode from 'vscode';

// Enough of a TextEditor to answer save(); everything else it needs a live one for is covered
// end-to-end by the integration suites.
function editorWhoseSaveReturns(saved: boolean, log: string[] = []): vscode.TextEditor {
	return {
		document: {
			save: async () => { log.push('save'); return saved; },
		},
	} as unknown as vscode.TextEditor;
}

// initialize()/insertText()/insertTextBlock()/getText() all require a live vscode.TextEditor
// and are already covered end-to-end by the integration suites in extension.test.ts.

suite('ResultFileModel', () => {

	test('FileName falls back to the default when outputFileName is not configured', () => {
		const model = new ResultFileModel(new FakeDao());
		assert.strictEqual(model.FileName, 'grep2File.g2f');
	});

	test('FileName uses the configured outputFileName', () => {
		const model = new ResultFileModel(new FakeDao({ outputFileName: 'myResults' }));
		assert.strictEqual(model.FileName, 'myResults');
	});

	test('FileExtension falls back to txt when outputContentFormat is not configured', () => {
		const model = new ResultFileModel(new FakeDao());
		assert.strictEqual(model.FileExtension, 'txt');
	});

	test('FileExtension accepts each allowed format', () => {
		for (const format of ['txt', 'tsv', 'csv', 'json']) {
			const model = new ResultFileModel(new FakeDao({ outputContentFormat: format }));
			assert.strictEqual(model.FileExtension, format);
		}
	});

	test('FileExtension falls back to txt for an unrecognized format', () => {
		const model = new ResultFileModel(new FakeDao({ outputContentFormat: 'exe' }));
		assert.strictEqual(model.FileExtension, 'txt');
	});

	test('FileNameWithExtension joins FileName and FileExtension with a dot', () => {
		const model = new ResultFileModel(new FakeDao({ outputFileName: 'myResults', outputContentFormat: 'csv' }));
		assert.strictEqual(model.FileNameWithExtension, 'myResults.csv');
	});

	test('FullPath is BASE_DIR + DIR_SEPARATOR + FileNameWithExtension', () => {
		const model = new ResultFileModel(new FakeDao({ outputFileName: 'myResults', outputContentFormat: 'csv' }));
		assert.strictEqual(model.FullPath, Common.BASE_DIR + Common.DIR_SEPARATOR + 'myResults.csv');
	});

	test('FileName/FileExtension are memoized: changing the dao afterwards has no effect', () => {
		const dao = new FakeDao({ outputFileName: 'first' });
		const model = new ResultFileModel(dao);

		assert.strictEqual(model.FileName, 'first');
		// A second FakeDao instance would return a different value, but this model already cached its own.
		assert.strictEqual(model.FileName, 'first');
	});

	test('addNewFile creates an empty file at FullPath', async () => {
		const dao = new FakeDao({ outputFileName: '__unit_test_addNewFile__', outputContentFormat: 'txt' });
		const model = new ResultFileModel(dao);
		const path = model.FullPath;

		try {
			const returned = await model.addNewFile();
			assert.strictEqual(returned, model);
			assert.ok(fs.existsSync(path));
			assert.strictEqual(fs.readFileSync(path, 'utf8'), '');
		} finally {
			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}
		}
	});


	test('AllFormatFullPaths covers every format this extension writes', () => {
		const model = new ResultFileModel(new FakeDao({ outputFileName: 'myResults', outputContentFormat: 'csv' }));
		const base = Common.BASE_DIR + Common.DIR_SEPARATOR;

		// Not just the format in use: switching outputContentFormat leaves the previous format's
		// file behind, and a search that does not skip it finds its own earlier results.
		assert.deepStrictEqual(model.AllFormatFullPaths, [
			base + 'myResults.txt',
			base + 'myResults.tsv',
			base + 'myResults.csv',
			base + 'myResults.json',
		]);
	});

	test('AllFormatFullPaths includes the file this search is writing', () => {
		const model = new ResultFileModel(new FakeDao({ outputContentFormat: 'json' }));

		assert.ok(model.AllFormatFullPaths.includes(model.FullPath));
	});

	test('save writes the document and reports that it did', async () => {
		const model = new ResultFileModel(new FakeDao());
		const log: string[] = [];
		model.initialize(editorWhoseSaveReturns(true, log));

		assert.strictEqual(await model.save(), true);
		// Everything up to here is an editor edit, so without this the file stays as addNewFile
		// left it - empty - and the results live only in an unsaved document.
		assert.deepStrictEqual(log, ['save']);
	});

	test('save reports a refusal rather than pretending the file was written', async () => {
		const model = new ResultFileModel(new FakeDao());
		model.initialize(editorWhoseSaveReturns(false));

		assert.strictEqual(await model.save(), false);
	});

	test('save reports false when no editor was ever bound', async () => {
		const model = new ResultFileModel(new FakeDao());

		assert.strictEqual(await model.save(), false);
	});

});
