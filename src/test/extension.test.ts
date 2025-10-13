import * as assert from 'assert';
import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { GrepController } from '../Controllers/GrepController';


suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// Prepare resource path
	const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
	const resourcePath = path.resolve(workspacePath, '..');
	const expectedFolderPath = path.resolve(resourcePath, 'expected');
	const inputFolderPath = path.resolve(resourcePath, 'input');
	const inputFilePath = path.join(inputFolderPath, 'grep2File.g2f.txt');

	test('Grep word by default mode - lo', async () => {

		// ---------------------------
		// Arrange
		// ---------------------------
		// Clear Editor Content
		(await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).edit(editBuilder => {
			editBuilder.delete(new vscode.Range(new vscode.Position(0,0), new vscode.Position(1000,0)));
		});
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
		controller.doActionWithParam('lo');

		// Wait for the process to complete
		await (async () => {return new Promise(resolve => setTimeout(resolve, 5000));})();

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
		controller.doActionWithParam('re/lo.*it/');

		// Wait for the process to complete
		await (async () => {return new Promise(resolve => setTimeout(resolve, 5000));})();

		// Get actual result
		const actualValue = (await vscode.window.showTextDocument(vscode.Uri.file(inputFilePath))).document.getText();

		// ---------------------------
		// Assert
		// ---------------------------
		assert.equal(expectedValue, actualValue);
	});

});