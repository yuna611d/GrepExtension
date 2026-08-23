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
	public callReadHead(byteCount: number): Promise<Buffer> {
		return this.readHead(byteCount);
	}

	// Which way the binary check read the file: the bounded head read, or one whole-file read.
	public headReads = 0;

	protected override readHead(byteCount: number): Promise<Buffer> {
		this.headReads++;
		return super.readHead(byteCount);
	}

	public static get singleReadSizeLimit(): number {
		return SeekedFileModel.SINGLE_READ_SIZE_LIMIT;
	}
}

// How often the entry is actually stat'd - the thing the caching controls - counted at the seam
// rather than by patching fs, so a cached failure is as observable as a cached success.
class CountingSeekedFileModel extends SeekedFileModel {
	public statEntryCallCount = 0;

	protected override statEntry(): Promise<fs.Stats | null> {
		this.statEntryCallCount++;
		return super.statEntry();
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

	test('getContent reads the real file at FullPath', async () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		const content = await model.getContent();
		assert.ok(content.length > 0);
		assert.ok(content.includes('Lorem ipsum'));
	});

	test('getContent is empty for an empty file', async () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'emptyFile.txt', INPUT_DIR, []);
		assert.strictEqual(await model.getContent(), '');
	});

	test('isFile/isDirectory are both false when the entry cannot be stat\'d', async () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'no-such-entry.txt', INPUT_DIR, []);

		// stat rejects with ENOENT here. It used to escape all the way out of the directory walk
		// and fail the whole grep; an entry nothing can be learned about is simply skipped instead.
		assert.strictEqual(await model.isFile(), false);
		assert.strictEqual(await model.isDirectory(), false);
	});

	test('isFile/isDirectory reflect the real filesystem entry', async () => {
		const file = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(await file.isFile(), true);
		assert.strictEqual(await file.isDirectory(), false);

		const dir = new SeekedFileModel(daoWithNoExclusions(), 'dir1', INPUT_DIR, []);
		assert.strictEqual(await dir.isFile(), false);
		assert.strictEqual(await dir.isDirectory(), true);
	});

	suite('stat caching', () => {

		test('an entry is stat\'d once however often it is asked what it is', async () => {
			const model = new CountingSeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);

			// The walk asks isDirectory of every entry and then asks isFile of every entry, so an
			// un-cached answer cost two identical stat calls for every entry in the workspace.
			assert.strictEqual(await model.isDirectory(), false);
			assert.strictEqual(await model.isFile(), true);
			assert.strictEqual(await model.isFile(), true);

			assert.strictEqual(model.statEntryCallCount, 1);
		});

		test('concurrent questions join the one stat rather than starting another', async () => {
			const model = new CountingSeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);

			// Asking before the first answer has arrived is what an async accessor makes possible,
			// and caching the value rather than the promise in flight would miss it.
			const answers = await Promise.all([model.isFile(), model.isDirectory(), model.isFile()]);

			assert.deepStrictEqual(answers, [true, false, true]);
			assert.strictEqual(model.statEntryCallCount, 1);
		});

		test('an entry that cannot be stat\'d is not re-stat\'d either', async () => {
			const model = new CountingSeekedFileModel(daoWithNoExclusions(), 'no-such-entry.txt', INPUT_DIR, []);

			assert.strictEqual(await model.isDirectory(), false);
			assert.strictEqual(await model.isFile(), false);

			// A rejected answer is still an answer: asking again cannot learn anything new.
			assert.strictEqual(model.statEntryCallCount, 1);
		});

		test('a directory is stat\'d once too', async () => {
			const model = new CountingSeekedFileModel(daoWithNoExclusions(), 'dir1', INPUT_DIR, []);

			assert.strictEqual(await model.isDirectory(), true);
			assert.strictEqual(await model.isFile(), false);

			assert.strictEqual(model.statEntryCallCount, 1);
		});

		test('the cached answer is the real one, not a stale or blank stand-in', async () => {
			const file = new CountingSeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
			const dir = new CountingSeekedFileModel(daoWithNoExclusions(), 'dir1', INPUT_DIR, []);

			// Each model caches its own entry, so one model's answer never stands in for another's.
			assert.strictEqual(await file.isFile(), true);
			assert.strictEqual(await dir.isFile(), false);
			assert.strictEqual(await file.isDirectory(), false);
			assert.strictEqual(await dir.isDirectory(), true);
		});

	});

	test('seemsBinary is false for a plain text file', async () => {
		const model = new SeekedFileModel(daoWithNoExclusions(), 'fileA.txt', INPUT_DIR, []);
		assert.strictEqual(await model.seemsBinary(), false);
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

		test('seemsBinary is true for a real binary file', async () => {
			const model = modelFor('sample-image.001.png', RESOURCE_DIR);

			assert.strictEqual(await model.seemsBinary(), true);
		});

		test('a control byte within the leading bytes marks the file binary', async () => {
			const content = Buffer.concat([Buffer.from('lorem'), Buffer.from([0]), Buffer.from('ipsum')]);
			fs.writeFileSync(path.join(tempDir, 'early.dat'), content);

			assert.strictEqual(await modelFor('early.dat', tempDir).seemsBinary(), true);
		});

		test('a control byte past the leading bytes does not', async () => {
			const content = Buffer.concat([Buffer.alloc(SNIFF_BYTES, 0x61), Buffer.from([0])]);
			fs.writeFileSync(path.join(tempDir, 'late.dat'), content);

			// Only the first 512 bytes are looked at, so the byte after them is out of scope - the
			// same answer the previous whole-file implementation gave.
			assert.strictEqual(await modelFor('late.dat', tempDir).seemsBinary(), false);
		});

		test('a file too large to hold is sniffed with the bounded read', async () => {
			const size = TestableSeekedFileModel.singleReadSizeLimit + 1;
			const content = Buffer.concat([Buffer.from([0]), Buffer.alloc(size, 0x61)]);
			fs.writeFileSync(path.join(tempDir, 'huge.dat'), content);
			const model = modelFor('huge.dat', tempDir);

			assert.strictEqual(await model.seemsBinary(), true);

			// Reading it in full to look at its start is exactly what must not happen.
			assert.strictEqual(model.headReads, 1);
		});

		test('a file small enough to hold is read once and sniffed from that', async () => {
			fs.writeFileSync(path.join(tempDir, 'small.txt'), 'lorem ipsum');
			const model = modelFor('small.txt', tempDir);

			assert.strictEqual(await model.seemsBinary(), false);

			// One read answers the check and feeds the search that follows it.
			assert.strictEqual(model.headReads, 0);
		});

		test('a searchable file keeps the bytes the check already read', async () => {
			const filePath = path.join(tempDir, 'kept.txt');
			fs.writeFileSync(filePath, 'lorem ipsum');
			const model = modelFor('kept.txt', tempDir);

			assert.strictEqual(await model.seemsBinary(), false);
			fs.rmSync(filePath);

			// Readable after the file is gone, which it could only be from the check's own read.
			assert.strictEqual(await model.getContent(), 'lorem ipsum');
		});

		test('a binary file does not keep them', async () => {
			const filePath = path.join(tempDir, 'dropped.dat');
			fs.writeFileSync(filePath, Buffer.concat([Buffer.from([0]), Buffer.from('lorem')]));
			const model = modelFor('dropped.dat', tempDir);

			assert.strictEqual(await model.seemsBinary(), true);
			fs.rmSync(filePath);

			// Nothing reads a binary, so holding onto one would only keep it in memory for as
			// long as its directory is being walked.
			await assert.rejects(model.getContent(), /ENOENT/);
		});

		test('readHead reads no more than it is asked for, however large the file', async () => {
			fs.writeFileSync(path.join(tempDir, 'big.dat'), Buffer.alloc(SNIFF_BYTES * 8, 0x61));

			const head = await modelFor('big.dat', tempDir).callReadHead(SNIFF_BYTES);

			// The bound that keeps a large binary out of memory: the check never sees the rest.
			assert.strictEqual(head.length, SNIFF_BYTES);
		});

		test('readHead returns just the file when it is shorter than the window', async () => {
			fs.writeFileSync(path.join(tempDir, 'small.dat'), Buffer.from('lorem'));

			const head = await modelFor('small.dat', tempDir).callReadHead(SNIFF_BYTES);

			assert.strictEqual(head.length, 'lorem'.length);
		});

	});

});
