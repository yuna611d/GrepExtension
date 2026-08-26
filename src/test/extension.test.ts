import * as assert from 'assert';
import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { GrepController } from '../Controllers/GrepController';
import { SettingDao } from '../DAO/SettingDao';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';

// Prepare resource path
const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
const resourcePath = path.resolve(workspacePath, '..');
const expectedFolderPath = path.resolve(resourcePath, 'expected');
const inputFolderPath = path.resolve(resourcePath, 'input');

// Grep output embeds absolute file paths (the "Search Dir:" line and every matched row's
// filePath), which differ by machine and OS. Normalize the path separator (Windows '\' vs
// POSIX '/') and the absolute workspace prefix down to a single placeholder so fixtures
// compare equal across environments.
//
// JSON output needs different handling: JSON.stringify escapes every literal '\' as '\\',
// so a real path separator always shows up doubled there, while other escapes (\", \r, \n, ...)
// stay single-backslash. Collapsing doubled backslashes handles JSON path separators without
// touching those other escapes; a second single-backslash pass (only safe for non-JSON, whose
// raw text is never escaped) would otherwise corrupt \" and \r into invalid /" and /r.
const PATH_PLACEHOLDER = '<WORKSPACE>';
function normalizePaths(text: string, isJson: boolean): string {
	const doubledSeparatorsCollapsed = text.replace(/\\\\/g, '/');
	const forwardSlashed = isJson ? doubledSeparatorsCollapsed : doubledSeparatorsCollapsed.replace(/\\/g, '/');
	const forwardSlashedWorkspacePath = workspacePath.replace(/\\/g, '/');
	return forwardSlashed.split(forwardSlashedWorkspacePath).join(PATH_PLACEHOLDER);
}

// fs.readdirSync() gives no ordering guarantee, and different OS/filesystem combinations
// (NTFS vs ext4, etc.) return directory entries in different orders - so the exact same set of
// matches can land in a different order in the output file depending on the platform the test
// runs on. Sort before comparing so the assertion checks "same matches" rather than "same
// matches in the same order". Applied to both sides so it's a no-op when order already agrees.
//
// .gitattributes normalizes the *source* fixture files under test-resources/input/ to CRLF on
// Windows checkouts and LF on Linux. LineMatcher strips that trailing \r when it splits a file
// into lines, so a match carries the same text either way and no platform-specific fix-up is
// needed here. This previously stripped a trailing \r from each json element's text field, which
// hid the fact that the \r was reaching the output at all - the fixtures now assert its absence.
function sortForComparison(text: string, isJson: boolean): string {
	if (isJson) {
		const elements = JSON.parse(text) as Array<{ text?: string }>;
		elements.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
		return JSON.stringify(elements);
	}
	return text.split(/\r?\n/).sort().join('\n');
}

suite('Extension Test Suite - txt output', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputFilePath = path.join(inputFolderPath, 'grep2File.g2f.txt');

	test('Grep word by default mode - lo', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : txt
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'txt', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'grep2File.g2f.txt');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('lo');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
		
	});

	test('Grep word by regexp mode - re/lo.*it/', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : txt
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'txt', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'regexp_grep2File.g2f.txt');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('re/lo.*it/');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
	});

});

suite('Extension Test Suite - tsv output', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputFilePath = path.join(inputFolderPath, 'grep2File.g2f.tsv');

	test('Grep word by default mode - lo', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : tsv
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'tsv', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'grep2File.g2f.tsv');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('lo');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
		
	});

	test('Grep word by regexp mode - re/lo.*it/', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : tsv
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'tsv', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'regexp_grep2File.g2f.tsv');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('re/lo.*it/');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
	});

});

suite('Extension Test Suite - csv output', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputFilePath = path.join(inputFolderPath, 'grep2File.g2f.csv');

	test('Grep word by default mode - lo', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : tsv
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'csv', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'grep2File.g2f.csv');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('lo');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
		
	});

	test('Grep word by regexp mode - re/lo.*it/', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : tsv
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'csv', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'regexp_grep2File.g2f.csv');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		// MEMO : command 後、inputbox へ値をセットすることは難しいらいため、UI操作ではなくControllerを操作
		// vscode.commands.executeCommand('extension.grepResult2File');
		const controller = new GrepController();
		await controller.doActionWithParam('re/lo.*it/');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, false), sortForComparison(normalizePaths(actualValue, false), false));
	});

});

suite('Extension Test Suite - json output', () => {
	vscode.window.showInformationMessage('Start all tests.');

	const inputFilePath = path.join(inputFolderPath, 'grep2File.g2f.json');

	test('Grep word by default mode - lo', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : json
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'json', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'grep2File.g2f.json');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		const controller = new GrepController();
		await controller.doActionWithParam('lo');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, true), sortForComparison(normalizePaths(actualValue, true), true));
		assert.doesNotThrow(() => JSON.parse(actualValue));

	});

	test('a second grep replaces the first result instead of appending to it', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		await (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : json
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'json', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'grep2File.g2f.json');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Two greps back to back, with nothing clearing the document in between. Appending left
		// "[...][...]" behind, which does not parse at all.
		await new GrepController().doActionWithParam('lo');
		await new GrepController().doActionWithParam('lo');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.doesNotThrow(() => JSON.parse(actualValue));
		assert.equal(sortForComparison(expectedValue, true), sortForComparison(normalizePaths(actualValue, true), true));

	});

	test('Grep word by regexp mode - re/lo.*it/', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
		// Setting : json
		await vscode.workspace.getConfiguration().update('grep2file.outputContentFormat', 'json', vscode.ConfigurationTarget.Global);
		// Get expected result
		const expectedFilePath = path.join(expectedFolderPath, 'regexp_grep2File.g2f.json');
		const expectedValue = fs.readFileSync(expectedFilePath, 'utf-8');

		// ---------------------------
		// Action
		// ---------------------------
		// Execute command
		const controller = new GrepController();
		await controller.doActionWithParam('re/lo.*it/');

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(sortForComparison(expectedValue, true), sortForComparison(normalizePaths(actualValue, true), true));
		assert.doesNotThrow(() => JSON.parse(actualValue));
	});

});

/**
 * Decoding is delegated to the editor, and only the extension host has it - so this is the one
 * place the real thing runs. The unit suite can only assert that the model asks and uses the
 * answer; what VS Code makes of a given file is asserted here.
 */
suite('Extension Test Suite - file encodings', () => {

	const sjisDir = path.join(inputFolderPath, '_Shift_JIS');

	function modelFor(fileName: string): SeekedFileModel {
		return new SeekedFileModel(new SettingDao(), fileName, sjisDir, []);
	}

	teardown(async () => {
		await vscode.workspace.getConfiguration().update('files.encoding', undefined, vscode.ConfigurationTarget.Global);
	});

	test('a UTF-16 file is searched instead of being written off as binary', async () => {
		const model = modelFor('utf16le-bom.txt');

		// Half the bytes of UTF-16 text are zero, which the binary check reads as "not text", so
		// every UTF-16 file in the workspace used to be skipped without ever being read.
		assert.strictEqual(await model.seemsBinary(), false);
		assert.ok((await model.getContent()).includes('日本語'));
	});

	test('a byte order mark is not left at the start of the text', async () => {
		const content = await modelFor('utf8-bom.txt').getContent();

		// Left in, it sits invisibly before the first character, so a search anchored at the start
		// of the line misses and the mark travels into the result file.
		assert.ok(!content.startsWith('\ufeff'));
		assert.ok(content.startsWith('日本語'));
	});

	test('files.encoding decides how an unmarked file is read', async () => {
		// Nothing in a Shift-JIS file says that it is one, so the setting is what settles it -
		// and the search now sees exactly what opening the file in the editor shows.
		await vscode.workspace.getConfiguration().update('files.encoding', 'shiftjis', vscode.ConfigurationTarget.Global);

		assert.ok((await modelFor('sjis-encoded.txt').getContent()).includes('日本語'));
	});

	test('without that setting the same file falls back to UTF-8, as the editor does', async () => {
		const content = await modelFor('sjis-encoded.txt').getContent();

		assert.ok(content.includes('\ufffd'));
		assert.ok(!content.includes('日本語'));
	});

	test('a UTF-8 file is unaffected by any of this', async () => {
		const content = await modelFor('fileA.txt').getContent();

		assert.ok(content.includes('Lorem'));
		assert.ok(!content.includes('\ufffd'));
	});

});
