import * as assert from 'assert';
import { LineMatcher } from '../../Services/LineMatcher';

suite('LineMatcher', () => {

	test('splitIntoNumberedLines numbers lines starting at 1 by default', () => {
		const result = LineMatcher.splitIntoNumberedLines('a\nb\nc');
		assert.deepStrictEqual(result, [
			{ lineText: 'a', lineNumber: 1 },
			{ lineText: 'b', lineNumber: 2 },
			{ lineText: 'c', lineNumber: 3 },
		]);
	});

	test('splitIntoNumberedLines strips the \\r of CRLF line endings', () => {
		const result = LineMatcher.splitIntoNumberedLines('a\r\nb\r\nc');
		assert.deepStrictEqual(result, [
			{ lineText: 'a', lineNumber: 1 },
			{ lineText: 'b', lineNumber: 2 },
			{ lineText: 'c', lineNumber: 3 },
		]);
	});

	test('splitIntoNumberedLines keeps a \\r that is not part of a line ending', () => {
		// Only one trailing \r is dropped, and only where it precedes the split point. A \r in
		// the middle of a line is content and must survive.
		const result = LineMatcher.splitIntoNumberedLines('a\rb\r\n\r\n');
		assert.deepStrictEqual(result, [
			{ lineText: 'a\rb', lineNumber: 1 },
			{ lineText: '', lineNumber: 2 },
			{ lineText: '', lineNumber: 3 },
		]);
	});

	test('splitIntoNumberedLines with a startLine skips leading lines and continues numbering from there', () => {
		const result = LineMatcher.splitIntoNumberedLines('a\nb\nc\nd', 2);
		assert.deepStrictEqual(result, [
			{ lineText: 'c', lineNumber: 3 },
			{ lineText: 'd', lineNumber: 4 },
		]);
	});

	test('splitIntoNumberedLines on a single-line string with no separator', () => {
		const result = LineMatcher.splitIntoNumberedLines('only line');
		assert.deepStrictEqual(result, [{ lineText: 'only line', lineNumber: 1 }]);
	});

	test('isContainSearchWord returns true when the regexp matches', () => {
		assert.strictEqual(LineMatcher.isContainSearchWord(/lo/i, 'Lorem ipsum'), true);
	});

	test('isContainSearchWord returns false when the regexp does not match', () => {
		assert.strictEqual(LineMatcher.isContainSearchWord(/xyz/i, 'Lorem ipsum'), false);
	});

});
