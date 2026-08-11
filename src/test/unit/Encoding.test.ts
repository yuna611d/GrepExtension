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
 * Characterization tests: these pin down what the extension does with non-UTF-8 files today,
 * which is decode them as UTF-8 anyway. They are not asserting desired behaviour.
 *
 * The _Shift_JIS fixture folder predates these tests and, despite its name, contained only
 * ASCII - so nothing ever exercised the encoding path and the folder implied a coverage that
 * did not exist. sjis-encoded.txt contains real Shift-JIS bytes so the gap is visible.
 *
 * FileModel hardcodes utf-8 (see the TODO on ResultFileModel.addNewFile about reading the
 * encoding from configuration). When that is addressed, these expectations should change.
 */
suite('Encoding (Shift-JIS handling)', () => {

	test('a Shift-JIS file is not mistaken for a binary, so it is searched', () => {
		const model = new SeekedFileModel(dao(), 'sjis-encoded.txt', SJIS_DIR, []);
		// seemsBinary only looks for control characters 0-8; Shift-JIS lead/trail bytes are
		// all >= 0x81, so the file is treated as text and does get read and matched against.
		assert.strictEqual(model.seemsBinary, false);
	});

	test('Shift-JIS content is decoded as UTF-8, producing replacement characters', () => {
		const model = new SeekedFileModel(dao(), 'sjis-encoded.txt', SJIS_DIR, []);

		// The fixture is "日本語テスト" / "あいうえお" encoded in Shift-JIS. Read as UTF-8 those
		// byte sequences are invalid, so the text the grep actually searches is mojibake.
		assert.ok(model.Content.includes('�'),
			'expected U+FFFD replacement characters from decoding Shift-JIS bytes as UTF-8');
		assert.ok(!model.Content.includes('日本語'),
			'Shift-JIS text is not recoverable while the encoding is hardcoded to utf-8');
	});

	test('the neighbouring fixture in the same folder is plain ASCII despite the folder name', () => {
		// Guards the assumption the golden fixtures rest on: _Shift_JIS/fileA.txt is ordinary
		// ASCII and contributes normal matches, so it must not be confused for encoded data.
		const model = new SeekedFileModel(dao(), 'fileA.txt', SJIS_DIR, []);
		assert.ok(!model.Content.includes('�'));
		assert.ok(model.Content.includes('Lorem'));
	});

});
