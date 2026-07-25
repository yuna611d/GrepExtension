import * as assert from 'assert';
import { Common } from '../../Commons/Common';
import { SeekedFileModel } from '../../Models/File/SeekedFileModel';
import { FakeDao } from '../testUtils/FakeDao';

// The test workspace root (.vscode-test.mjs points it at test-resources/input/) is used directly
// so Content/isFile/isDirectory/seemsBinary can be exercised against real fixture files.
const INPUT_DIR = Common.BASE_DIR;

// SeekedFileModel falls back to `['']` when no `exclude` setting is configured, and an empty-string
// RegExp matches every extension - so any test that wants "not excluded by extension" must pass
// exclude: [] explicitly rather than relying on FakeDao's default (no `exclude` key at all).
function daoWithNoExclusions(overrides: Record<string, string | string[] | boolean> = {}): FakeDao {
	return new FakeDao({ exclude: [], ...overrides });
}

suite('SeekedFileModel', () => {

	test('FileName/FileExtension are parsed from the given filename', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(model.FileName, 'fileA');
		assert.strictEqual(model.FileExtension, 'txt');
	});

	test('a name with no extension yields itself as the name and an empty extension', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'dir1', INPUT_DIR, []);
		assert.strictEqual(model.FileName, 'dir1');
		assert.strictEqual(model.FileExtension, '');
	});

	test('FullPath joins TargetDir and FileNameWithExtension with DIR_SEPARATOR', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(model.FullPath, INPUT_DIR + Common.DIR_SEPARATOR + 'fileA.txt');
	});

	test('Content reads the real file at FullPath', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.ok(model.Content.length > 0);
		assert.ok(model.Content.includes('Lorem ipsum'));
	});

	test('Content is empty for an empty file', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'emptyFile.txt', INPUT_DIR, []);
		assert.strictEqual(model.Content, '');
	});

	test('isFile/isDirectory reflect the real filesystem entry', () => {
		const file = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(file.isFile, true);
		assert.strictEqual(file.isDirectory, false);

		const dir = new SeekedFileModel(daoWithNoExclusions(), 'dir1', INPUT_DIR, []);
		assert.strictEqual(dir.isFile, false);
		assert.strictEqual(dir.isDirectory, true);
	});

	test('seemsBinary is false for a plain text file', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(model.seemsBinary, false);
	});

	test('isExcludedFile is true when FullPath is in excludedFullPaths', () => {
		const path = INPUT_DIR + Common.DIR_SEPARATOR + 'fileA.txt';
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, [path]);
		assert.strictEqual(model.isExcludedFile(), true);
	});

	test('isExcludedFile is false when FullPath is not in excludedFullPaths', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, ['/some/other/file.txt']);
		assert.strictEqual(model.isExcludedFile(), false);
	});

	test('isExcludedFile is true when the extension matches the configured exclude list', () => {
		const dao = new FakeDao({ exclude: ['bin', 'dll'] });
		const model = new SeekedFileModel(dao, 'app.dll', INPUT_DIR, []);
		assert.strictEqual(model.isExcludedFile(), true);
	});

	test('isExcludedFile extension matching is case-insensitive', () => {
		const dao = new FakeDao({ exclude: ['DLL'] });
		const model = new SeekedFileModel(dao, 'app.dll', INPUT_DIR, []);
		assert.strictEqual(model.isExcludedFile(), true);
	});

	test('isIgnoredFileOrDirectory is true for a hidden file when ignoreHiddenFile is on', () => {
		const dao = daoWithNoExclusions({ ignoreHiddenFile: true });
		const model = new SeekedFileModel(dao, '.gitignore', INPUT_DIR, []);
		assert.strictEqual(model.isIgnoredFileOrDirectory(), true);
	});

	test('isIgnoredFileOrDirectory is false for a hidden file when ignoreHiddenFile is off', () => {
		const dao = daoWithNoExclusions({ ignoreHiddenFile: false });
		const model = new SeekedFileModel(dao, '.gitignore', INPUT_DIR, []);
		assert.strictEqual(model.isIgnoredFileOrDirectory(), false);
	});

	test('isIgnoredFileOrDirectory is false for a normal, non-excluded file', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(model.isIgnoredFileOrDirectory(), false);
	});

});
