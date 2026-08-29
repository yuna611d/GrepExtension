import * as assert from 'assert';
import { GrepController, isUsableWorkspaceRoot } from '../../Controllers/GrepController';

// Records what the prompt's answer led to, without running a real search: startSearch() is the
// only thing callback() does with a word, so counting it says whether a search happened at all.
class RecordingGrepController extends GrepController {
	public readonly wordsSearched: string[] = [];

	protected async startSearch(searchWord: string): Promise<void> {
		this.wordsSearched.push(searchWord);
	}

	public answerPromptWith(v: string | undefined): Promise<void> {
		return this.callback(v);
	}
}

suite('GrepController', () => {

	suite('isUsableWorkspaceRoot', () => {

		test('accepts a real workspace path', () => {
			assert.strictEqual(isUsableWorkspaceRoot('/home/me/project'), true);
			assert.strictEqual(isUsableWorkspaceRoot('C:\\work\\project'), true);
		});

		// Common.BASE_DIR returns "" when no folder is open. Letting that through builds the
		// result path as "" + separator + fileName, which resolves to the filesystem root.
		test('rejects the empty base dir returned when no folder is open', () => {
			assert.strictEqual(isUsableWorkspaceRoot(''), false);
		});

		test('rejects a whitespace-only base dir', () => {
			assert.strictEqual(isUsableWorkspaceRoot('   '), false);
			assert.strictEqual(isUsableWorkspaceRoot('\t'), false);
		});

	});

	suite('answering the search prompt', () => {

		// Escape resolves undefined. Treating that as a search created the result file and then
		// apologised for a word the user never gave - a stray file in the workspace and a
		// failure message, for backing out of a prompt.
		test('a dismissed prompt starts no search', async () => {
			const controller = new RecordingGrepController();

			await controller.answerPromptWith(undefined);

			assert.deepStrictEqual(controller.wordsSearched, []);
		});

		// An empty word that was actually submitted is a different thing: a search this
		// extension cannot run, which it should still say so about.
		test('an empty word that was submitted is still a search', async () => {
			const controller = new RecordingGrepController();

			await controller.answerPromptWith('');

			assert.deepStrictEqual(controller.wordsSearched, ['']);
		});

		test('a word is searched for as given', async () => {
			const controller = new RecordingGrepController();

			await controller.answerPromptWith('re/lo.*it/');

			assert.deepStrictEqual(controller.wordsSearched, ['re/lo.*it/']);
		});

	});

});
