import * as assert from 'assert';
import * as vscode from 'vscode';
import { DecorationService } from '../../Services/DecorationService';

// The type each instance decorates with is protected, so reach it the way the other suites reach
// protected members.
class TestableDecorationService extends DecorationService {
	public static theTypeUsed(): vscode.TextEditorDecorationType {
		return DecorationService.decorationTheme();
	}

	public appliedRanges: vscode.Range[] | undefined;
	public appliedWith: vscode.TextEditorDecorationType | undefined;
}

// Records what a search would hand to VS Code, without needing a live editor.
function recordingEditor(record: Array<{ type: vscode.TextEditorDecorationType; ranges: readonly vscode.Range[] }>): vscode.TextEditor {
	return {
		setDecorations: (type: vscode.TextEditorDecorationType, ranges: readonly vscode.Range[]) => {
			record.push({ type, ranges });
		},
	} as unknown as vscode.TextEditor;
}

const someRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 3));

suite('DecorationService', () => {

	test('every search decorates with the same type', () => {
		// A type per search left the previous search's highlights with nothing able to remove
		// them: setDecorations only replaces decorations of the type it is given.
		const first = TestableDecorationService.theTypeUsed();
		const second = TestableDecorationService.theTypeUsed();

		assert.strictEqual(first, second);
	});

	test('applying ranges hands them to the editor under that shared type', () => {
		const record: Array<{ type: vscode.TextEditorDecorationType; ranges: readonly vscode.Range[] }> = [];
		const service = new TestableDecorationService();

		service.setEditor(recordingEditor(record)).setRanges([someRange]).doService();

		assert.strictEqual(record.length, 1);
		assert.strictEqual(record[0].type, TestableDecorationService.theTypeUsed());
		assert.deepStrictEqual(record[0].ranges, [someRange]);
	});

	test('clear takes every highlight back', () => {
		const record: Array<{ type: vscode.TextEditorDecorationType; ranges: readonly vscode.Range[] }> = [];
		const service = new TestableDecorationService();
		service.setEditor(recordingEditor(record)).setRanges([someRange]).doService();

		service.clear();

		// An empty set under the same type is what removes what the last search left.
		assert.deepStrictEqual(record[record.length - 1].ranges, []);
		assert.strictEqual(record[record.length - 1].type, TestableDecorationService.theTypeUsed());
	});

	test('a search with no editor bound decorates nothing', () => {
		const record: Array<{ type: vscode.TextEditorDecorationType; ranges: readonly vscode.Range[] }> = [];

		new TestableDecorationService().setRanges([someRange]).doService();

		assert.deepStrictEqual(record, []);
	});

});
