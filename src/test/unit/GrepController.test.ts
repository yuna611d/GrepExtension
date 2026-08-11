import * as assert from 'assert';
import { isUsableWorkspaceRoot } from '../../Controllers/GrepController';

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

});
