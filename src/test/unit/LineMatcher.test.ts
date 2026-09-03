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
		// Two line breaks, two lines: the second is genuinely blank, and there is no third - this
		// used to assert one, which was the empty piece the final break leaves behind.
		assert.deepStrictEqual(result, [
			{ lineText: 'a\rb', lineNumber: 1 },
			{ lineText: '', lineNumber: 2 },
		]);
	});

	suite('the line a trailing break does not make', () => {

		// Splitting on the line break produces one more piece than there are lines whenever the
		// content ends with one - which most files do. Nothing usually matches an empty line, so
		// it went unnoticed until a search matched one.
		test('a file ending in a line break has no line after it', () => {
			assert.deepStrictEqual(LineMatcher.splitIntoNumberedLines('alpha\nbeta\n'), [
				{ lineText: 'alpha', lineNumber: 1 },
				{ lineText: 'beta', lineNumber: 2 },
			]);
		});

		test('a blank last line the file really has is kept', () => {
			assert.deepStrictEqual(LineMatcher.splitIntoNumberedLines('alpha\n\n'), [
				{ lineText: 'alpha', lineNumber: 1 },
				{ lineText: '', lineNumber: 2 },
			]);
		});

		test('a file with no trailing break is unchanged', () => {
			assert.deepStrictEqual(LineMatcher.splitIntoNumberedLines('alpha\nbeta'), [
				{ lineText: 'alpha', lineNumber: 1 },
				{ lineText: 'beta', lineNumber: 2 },
			]);
		});

		test('an empty file has no lines to search', () => {
			assert.deepStrictEqual(LineMatcher.splitIntoNumberedLines(''), [{ lineText: '', lineNumber: 1 }]);
			assert.deepStrictEqual(LineMatcher.splitIntoNumberedLines('\n'), [{ lineText: '', lineNumber: 1 }]);
		});

		// What made it visible: searching for blank lines reported one in every file, at a line
		// number one past the end - a position the editor cannot even go to.
		test('a blank-line search finds no phantom at the end of a file', () => {
			const lines = LineMatcher.splitIntoNumberedLines('alpha\nbeta\n');
			const blank = lines.filter(v => LineMatcher.isContainSearchWord(/^\s*$/, v.lineText));

			assert.deepStrictEqual(blank, []);
		});

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
