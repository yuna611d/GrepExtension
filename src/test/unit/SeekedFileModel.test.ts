import * as assert from 'assert';
import { Common } from '../../Commons/Common';
import { SeekedFileModel } from '../../Models/File/SeekedFileModel';
import { FakeDao } from '../testUtils/FakeDao';

// The test workspace root (.vscode-test.mjs points it at test-resources/input/) is used directly
// so Content/isFile/isDirectory/seemsBinary can be exercised against real fixture files.
const INPUT_DIR = Common.BASE_DIR;

// SeekedFileModel excludes nothing when no `exclude` setting is configured, so passing exclude: []
// is the same as omitting it. Kept explicit so each test states which exclusions it runs under.
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

	test('isFile/isDirectory are both false when the entry cannot be stat\'d', () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'no-such-entry.txt', INPUT_DIR, []);

		// statSync throws ENOENT here. It used to escape all the way out of the directory walk and
		// fail the whole grep; an entry nothing can be learned about is simply skipped instead.
		assert.strictEqual(model.isFile, false);
		assert.strictEqual(model.isDirectory, false);
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

	test('an excluded extension matches whole extensions only, not substrings of them', () => {
		const dao = new FakeDao({ exclude: ['js'] });

		assert.strictEqual(new SeekedFileModel(dao, 'app.js', INPUT_DIR, []).isExcludedFile(), true);
		// Matched as a pattern, 'js' also matched 'json' - so excluding .js files silently
		// dropped every .json file from the search too.
		assert.strictEqual(new SeekedFileModel(dao, 'package.json', INPUT_DIR, []).isExcludedFile(), false);
	});

	test('an excluded extension containing regexp syntax is matched literally', () => {
		const dao = new FakeDao({ exclude: ['c++'] });

		// Compiled as a RegExp this threw SyntaxError: Nothing to repeat, failing the whole grep.
		assert.strictEqual(new SeekedFileModel(dao, 'main.c++', INPUT_DIR, []).isExcludedFile(), true);
		assert.strictEqual(new SeekedFileModel(dao, 'main.cpp', INPUT_DIR, []).isExcludedFile(), false);
	});

	test('an excluded extension is accepted with a leading dot or surrounding spaces', () => {
		const dao = new FakeDao({ exclude: ['.DLL', '  bin  '] });

		assert.strictEqual(new SeekedFileModel(dao, 'app.dll', INPUT_DIR, []).isExcludedFile(), true);
		assert.strictEqual(new SeekedFileModel(dao, 'app.bin', INPUT_DIR, []).isExcludedFile(), true);
	});

	test('a comma separated string is accepted, as the setting used to be declared', () => {
		const dao = new FakeDao({ exclude: 'bin,dll' });

		// Reading this shape as an array threw `configured.map is not a function`, which failed
		// the grep outright for anyone whose settings.json still holds the old string form.
		assert.strictEqual(new SeekedFileModel(dao, 'app.dll', INPUT_DIR, []).isExcludedFile(), true);
		assert.strictEqual(new SeekedFileModel(dao, 'fileA.txt', INPUT_DIR, []).isExcludedFile(), false);
	});

	test('an empty entry in the exclude list excludes nothing', () => {
		const dao = new FakeDao({ exclude: [''] });

		// An empty RegExp matches every extension, so this used to exclude every file in the
		// workspace and produce an empty result.
		assert.strictEqual(new SeekedFileModel(dao, 'fileA.txt', INPUT_DIR, []).isExcludedFile(), false);
	});

	test('nothing is excluded by extension when the setting is absent', () => {
		const dao = new FakeDao({});

		assert.strictEqual(new SeekedFileModel(dao, 'fileA.txt', INPUT_DIR, []).isExcludedFile(), false);
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
