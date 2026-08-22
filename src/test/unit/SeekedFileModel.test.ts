import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Common } from '../../Commons/Common';
import { SeekedFileModel } from '../../Models/File/SeekedFileModel';
import { FakeDao } from '../testUtils/FakeDao';

// readHead is protected: it is the bound on how much of a file the binary check reads, which is
// the thing worth pinning, so reach it the way the other suites reach protected methods.
class TestableSeekedFileModel extends SeekedFileModel {
	public callReadHead(byteCount: number): Buffer {
		return this.readHead(byteCount);
	}
}

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

	suite('binary detection', () => {

		const RESOURCE_DIR = path.resolve(INPUT_DIR, '..');
		const SNIFF_BYTES = 512;

		let tempDir = '';

		setup(() => {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g2f-sniff-'));
		});

		teardown(() => {
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		function modelFor(fileName: string, targetDir: string): TestableSeekedFileModel {
			return new TestableSeekedFileModel(daoWithNoExclusions(), fileName, targetDir, []);
		}

		test('seemsBinary is true for a real binary file', () => {
			const model = modelFor('sample-image.001.png', RESOURCE_DIR);

			assert.strictEqual(model.seemsBinary, true);
		});

		test('a control byte within the leading bytes marks the file binary', () => {
			const content = Buffer.concat([Buffer.from('lorem'), Buffer.from([0]), Buffer.from('ipsum')]);
			fs.writeFileSync(path.join(tempDir, 'early.dat'), content);

			assert.strictEqual(modelFor('early.dat', tempDir).seemsBinary, true);
		});

		test('a control byte past the leading bytes does not', () => {
			const content = Buffer.concat([Buffer.alloc(SNIFF_BYTES, 0x61), Buffer.from([0])]);
			fs.writeFileSync(path.join(tempDir, 'late.dat'), content);

			// Only the first 512 bytes are looked at, so the byte after them is out of scope - the
			// same answer the previous whole-file implementation gave.
			assert.strictEqual(modelFor('late.dat', tempDir).seemsBinary, false);
		});

		test('readHead reads no more than it is asked for, however large the file', () => {
			fs.writeFileSync(path.join(tempDir, 'big.dat'), Buffer.alloc(SNIFF_BYTES * 8, 0x61));

			const head = modelFor('big.dat', tempDir).callReadHead(SNIFF_BYTES);

			// The bound that keeps a large binary out of memory: the check never sees the rest.
			assert.strictEqual(head.length, SNIFF_BYTES);
		});

		test('readHead returns just the file when it is shorter than the window', () => {
			fs.writeFileSync(path.join(tempDir, 'small.dat'), Buffer.from('lorem'));

			const head = modelFor('small.dat', tempDir).callReadHead(SNIFF_BYTES);

			assert.strictEqual(head.length, 'lorem'.length);
		});

	});

});
