import * as assert from 'assert';
import { Common } from '../../Commons/Common';
import { SeekedFileModel } from '../../Models/File/SeekedFileModel';
import { FakeDao } from '../testUtils/FakeDao';

// The test workspace root (.vscode-test.mjs points it at test-resources/input/).
const INPUT_DIR = Common.BASE_DIR;
const SJIS_DIR = INPUT_DIR + Common.DIR_SEPARATOR + '_Shift_JIS';

function dao(): FakeDao {
	return new FakeDao({ exclude: [] });
}

/**
 * What the extension makes of files that are not plain UTF-8.
 *
 * Decoding is the editor's job now - the model hands the bytes to the dao, which asks VS Code,
 * which applies the byte order mark and the `files.encoding` settings for that file. These tests
 * run against FakeDao, which stands in for that with the two rules a unit test can pin: honour a
 * byte order mark, otherwise UTF-8. What the editor's settings and its guessing make of an
 * unmarked file is the integration suite's business, since only the extension host has them.
 *
 * The _Shift_JIS fixture folder predates these tests and, despite its name, contained only
 * ASCII - so nothing ever exercised the encoding path and the folder implied a coverage that
 * did not exist. sjis-encoded.txt contains real Shift-JIS bytes so the gap is visible.
 */
suite('Encoding', () => {

	test('a Shift-JIS file is not mistaken for a binary, so it is searched', async () => {
		const model = new SeekedFileModel(dao(), 'sjis-encoded.txt', SJIS_DIR, []);
		// seemsBinary only looks for control characters 0-8; Shift-JIS lead/trail bytes are
		// all >= 0x81, so the file is treated as text and does get read and matched against.
		assert.strictEqual(await model.seemsBinary(), false);
	});

	test('an unmarked Shift-JIS file falls back to UTF-8, as the editor would without a setting', async () => {
		const model = new SeekedFileModel(dao(), 'sjis-encoded.txt', SJIS_DIR, []);
		const content = await model.getContent();

		// The fixture is "日本語テスト" / "あいうえお" in Shift-JIS, with nothing in the bytes to
		// say so. Nothing can know that from the file alone, so this is what the editor shows too
		// until files.encoding says otherwise or files.autoGuessEncoding is turned on.
		assert.ok(content.includes('�'));
		assert.ok(!content.includes('日本語'));
	});

	test('the encoding the editor picks is what gets searched', async () => {
		const configured = dao();
		configured.forcedEncoding = 'shift_jis';
		const model = new SeekedFileModel(configured, 'sjis-encoded.txt', SJIS_DIR, []);

		// The same bytes, read the way a configured editor reads them.
		assert.ok((await model.getContent()).includes('日本語'));
	});

	test('the file being decoded is named, so per-file encoding settings can apply', async () => {
		const named = dao();
		const model = new SeekedFileModel(named, 'sjis-encoded.txt', SJIS_DIR, []);

		await model.getContent();

		// VS Code keys files.encoding overrides on the file, so it has to be told which one.
		assert.deepStrictEqual(named.decodedPaths, [SJIS_DIR + Common.DIR_SEPARATOR + 'sjis-encoded.txt']);
	});

	test('a UTF-16 file is searched rather than written off as binary', async () => {
		const model = new SeekedFileModel(dao(), 'utf16le-bom.txt', SJIS_DIR, []);

		// Half the bytes of UTF-16 English text are zero, which the binary check reads as "not
		// text" - so every UTF-16 file in the workspace used to be skipped without being read.
		assert.strictEqual(await model.seemsBinary(), false);
		assert.ok((await model.getContent()).includes('日本語'));
	});

	test('a byte order mark is not left at the start of the text', async () => {
		const model = new SeekedFileModel(dao(), 'utf8-bom.txt', SJIS_DIR, []);
		const content = await model.getContent();

		// Left in, it sits invisibly before the first line's first character, so a search anchored
		// there misses and the mark travels into the result file.
		assert.ok(!content.startsWith('\ufeff'));
		assert.ok(content.startsWith('日本語'));
	});

	test('the neighbouring fixture in the same folder is plain ASCII despite the folder name', async () => {
		// Guards the assumption the golden fixtures rest on: _Shift_JIS/fileA.txt is ordinary
		// ASCII and contributes normal matches, so it must not be confused for encoded data.
		const model = new SeekedFileModel(dao(), 'fileA.txt', SJIS_DIR, []);
		const content = await model.getContent();
		assert.ok(!content.includes('�'));
		assert.ok(content.includes('Lorem'));
	});

});
