import * as assert from 'assert';
import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { GrepController } from '../Controllers/GrepController';

// Prepare resource path
const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
const resourcePath = path.resolve(workspacePath, '..');
const expectedFolderPath = path.resolve(resourcePath, 'expected');
const inputFolderPath = path.resolve(resourcePath, 'input');

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
		assert.equal(expectedValue, actualValue);
		
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
		assert.equal(expectedValue, actualValue);
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
		assert.equal(expectedValue, actualValue);
		
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
		assert.equal(expectedValue, actualValue);
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
		assert.equal(expectedValue, actualValue);
		
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
		assert.equal(expectedValue, actualValue);
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
		assert.equal(expectedValue, actualValue);
		assert.doesNotThrow(() => JSON.parse(actualValue));

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
		assert.equal(expectedValue, actualValue);
		assert.doesNotThrow(() => JSON.parse(actualValue));
	});

});