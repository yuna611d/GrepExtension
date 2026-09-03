import * as assert from 'assert';
import { SearchWordConfiguration } from '../../Models/SearchWordConfiguration';

suite('SearchWordConfiguration', () => {

	test('has no valid search word before configure() is called', () => {
		const config = new SearchWordConfiguration();
		assert.strictEqual(config.hasValidSearchWord(), false);
	});

	test('configure(undefined) leaves the search word invalid', () => {
		const config = new SearchWordConfiguration();
		config.configure(undefined);
		assert.strictEqual(config.hasValidSearchWord(), false);
	});

	test('configure(null) leaves the search word invalid', () => {
		const config = new SearchWordConfiguration();
		config.configure(null);
		assert.strictEqual(config.hasValidSearchWord(), false);
	});

	test('plain word input is treated as non-regexp mode', () => {
		const config = new SearchWordConfiguration();
		config.configure('lo');
		assert.strictEqual(config.hasValidSearchWord(), true);
		assert.strictEqual(config.IsRegExpMode, false);
		assert.strictEqual(config.SearchWord, 'lo');
	});

	test('plain word input is matched case-insensitively by default', () => {
		const config = new SearchWordConfiguration();
		config.configure('lo');
		const re = config.getRegExp();
		assert.strictEqual(re.test('LOREM'), true);
	});

	test('re/pattern/ input without flags is parsed as regexp mode', () => {
		const config = new SearchWordConfiguration();
		config.configure('re/lo.*it/');
		assert.strictEqual(config.IsRegExpMode, true);
		assert.strictEqual(config.SearchWord, 'lo.*it');
		assert.strictEqual(config.RegExpOptions, '');
	});

	test('re/pattern/ input without the i flag is matched case-sensitively', () => {
		const config = new SearchWordConfiguration();
		config.configure('re/lo.*it/');
		const re = config.getRegExp();
		assert.strictEqual(re.test('Lorem ipsum dolor sit'), true);
		assert.strictEqual(re.test('LOREM IPSUM DOLOR SIT'), false);
	});

	test('re/pattern/i input is matched case-insensitively', () => {
		const config = new SearchWordConfiguration();
		config.configure('re/lo.*it/i');
		assert.strictEqual(config.RegExpOptions, 'i');
		const re = config.getRegExp();
		assert.strictEqual(re.test('LOREM IPSUM DOLOR SIT'), true);
	});

	test('flags outside the allowed set (only "i") are dropped', () => {
		const config = new SearchWordConfiguration();
		config.configure('re/lo.*it/gim');
		assert.strictEqual(config.RegExpOptions, 'i');
	});

	test('a search word that only looks like the DSL (no closing slash) falls back to a literal, non-regexp word', () => {
		const config = new SearchWordConfiguration();
		config.configure('re/abc');
		assert.strictEqual(config.hasValidSearchWord(), true);
		assert.strictEqual(config.IsRegExpMode, false);
		assert.strictEqual(config.SearchWord, 're/abc');
	});

	suite('the re/ prefix has to open the word', () => {

		// The prefix used to be looked for anywhere inside the word, so anything containing "re/"
		// and a later "/" was silently reinterpreted: these are ordinary things to search a
		// codebase for, and the result gave no sign the word had been changed.
		const misreadBefore: Array<[string, string]> = [
			['feature/login/', 'login'],
			['core/lib/', 'lib'],
			['store/x/', 'x'],
			['a re/b/ c', 'b'],
		];

		for (const [word, wasSearchedFor] of misreadBefore) {
			test(`"${word}" is a literal word, not the pattern ${wasSearchedFor}`, () => {
				const config = new SearchWordConfiguration();
				config.configure(word);

				assert.strictEqual(config.IsRegExpMode, false);
				assert.notStrictEqual(config.SearchWord, wasSearchedFor);
				// Escaped for the literal search it now is, so it matches itself and nothing else.
				assert.strictEqual(config.getRegExp().test(word), true);
			});
		}

		test('the documented form still works', () => {
			const config = new SearchWordConfiguration();
			config.configure('re/lo.*it/i');

			assert.strictEqual(config.IsRegExpMode, true);
			assert.strictEqual(config.SearchWord, 'lo.*it');
			assert.strictEqual(config.RegExpOptions, 'i');
		});

		test('a pattern may itself contain a slash', () => {
			const config = new SearchWordConfiguration();
			config.configure('re/a\\/b/');

			assert.strictEqual(config.IsRegExpMode, true);
			assert.strictEqual(config.SearchWord, 'a\\/b');
		});

	});

	suite('the two regexps a search uses agree, whichever is asked for first', () => {

		// A search asks for the non-global one to find matches and the global one to highlight
		// them. The ignore-case flag for a plain word used to be added as a side effect of the
		// first non-global call, so asking in the other order handed back a global regexp without
		// it - the finder and the highlighter disagreeing about case, which shows up as a matched
		// line written to the result with nothing highlighted on it.
		test('finder first', () => {
			const config = new SearchWordConfiguration();
			config.configure('Needle');

			const finder = config.getRegExp();
			const highlighter = config.getRegExp(true);

			assert.strictEqual(finder.flags, 'i');
			assert.strictEqual(highlighter.flags, 'gi');
		});

		test('highlighter first', () => {
			const config = new SearchWordConfiguration();
			config.configure('Needle');

			const highlighter = config.getRegExp(true);
			const finder = config.getRegExp();

			assert.strictEqual(highlighter.flags, 'gi');
			assert.strictEqual(finder.flags, 'i');
		});

		test('both find the same line, in either order', () => {
			const asked = new SearchWordConfiguration();
			asked.configure('Needle');
			const highlighter = asked.getRegExp(true);

			assert.strictEqual(asked.getRegExp().test('a NEEDLE here'), true);
			highlighter.lastIndex = 0;
			assert.strictEqual(highlighter.test('a NEEDLE here'), true);
		});

		// A pattern says its own flags, so asking twice must not quietly add one it did not ask
		// for. Repeated calls used to keep appending to the same options string.
		test('a case-sensitive pattern stays case-sensitive however often it is asked for', () => {
			const config = new SearchWordConfiguration();
			config.configure('re/Needle/');

			assert.strictEqual(config.getRegExp().flags, '');
			assert.strictEqual(config.getRegExp(true).flags, 'g');
			assert.strictEqual(config.getRegExp(true).flags, 'g');
		});

	});

	test('getRegExp() caches the compiled RegExp across calls', () => {
		const config = new SearchWordConfiguration();
		config.configure('lo');
		const first = config.getRegExp();
		const second = config.getRegExp();
		assert.strictEqual(first, second);
	});

});
