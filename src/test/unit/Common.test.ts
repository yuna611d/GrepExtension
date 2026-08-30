import * as assert from 'assert';
import { Common } from '../../Commons/Common';

// What VS Code hands over as workspace.workspaceFolders, reduced to the part this reads.
function folders(...paths: string[]) {
	return paths.map(fsPath => ({ uri: { fsPath } }));
}

suite('Common', () => {

	suite('folderPaths', () => {

		// A workspace is not one folder. Only the first used to be searched, so a word sitting in
		// the second was reported as not being in the workspace at all.
		test('keeps every folder the workspace was opened with', () => {
			assert.deepStrictEqual(
				Common.folderPaths(folders('/app', '/lib', '/docs')),
				['/app', '/lib', '/docs']);
		});

		test('keeps them in the order they were given', () => {
			assert.deepStrictEqual(Common.folderPaths(folders('/lib', '/app')), ['/lib', '/app']);
		});

		test('no folder open is no path to search', () => {
			assert.deepStrictEqual(Common.folderPaths([]), []);
			assert.deepStrictEqual(Common.folderPaths(undefined), []);
			assert.deepStrictEqual(Common.folderPaths(null), []);
		});

		// The same emptiness BASE_DIR is checked for before a search runs. Walking one of these
		// would search the filesystem root, or whatever the process happens to be sitting in.
		test('drops a folder with a blank path', () => {
			assert.deepStrictEqual(Common.folderPaths(folders('/app', '', '  ', '/lib')), ['/app', '/lib']);
		});

	});

});
