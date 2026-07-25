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

	test('getRegExp() caches the compiled RegExp across calls', () => {
		const config = new SearchWordConfiguration();
		config.configure('lo');
		const first = config.getRegExp();
		const second = config.getRegExp();
		assert.strictEqual(first, second);
	});

});
