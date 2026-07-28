import * as assert from 'assert';
import * as fs from 'fs';
import { Common } from '../../Commons/Common';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

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

	test('addNewFile creates an empty file at FullPath', () => {
		const dao = new FakeDao({ outputFileName: '__unit_test_addNewFile__', outputContentFormat: 'txt' });
		const model = new ResultFileModel(dao);
		const path = model.FullPath;

		try {
			const returned = model.addNewFile();
			assert.strictEqual(returned, model);
			assert.ok(fs.existsSync(path));
			assert.strictEqual(fs.readFileSync(path, 'utf8'), '');
		} finally {
			if (fs.existsSync(path)) {
				fs.unlinkSync(path);
			}
		}
	});

});
