import * as assert from 'assert';
import { PathExcluder } from '../../Commons/PathExcluder';

suite('PathExcluder', () => {

	// The globs VS Code ships in files.exclude and search.exclude out of the box. Honouring them
	// is what keeps node_modules out of a search without anyone configuring anything.
	suite('the editor\'s own defaults', () => {

		const excluder = new PathExcluder([
			'**/.git', '**/.svn', '**/.hg', '**/CVS', '**/.DS_Store', '**/Thumbs.db',
			'**/node_modules', '**/bower_components', '**/*.code-search',
		]);

		test('excludes a folder at the workspace root', () => {
			assert.strictEqual(excluder.excludes('node_modules'), true);
			assert.strictEqual(excluder.excludes('.git'), true);
		});

		test('excludes the same folder nested any number of levels down', () => {
			assert.strictEqual(excluder.excludes('packages/app/node_modules'), true);
			assert.strictEqual(excluder.excludes('a/b/c/d/node_modules'), true);
		});

		test('leaves everything else alone', () => {
			assert.strictEqual(excluder.excludes('src'), false);
			assert.strictEqual(excluder.excludes('src/Services/GrepService.ts'), false);
			// A name that merely contains an excluded one is a different folder.
			assert.strictEqual(excluder.excludes('my_node_modules'), false);
			assert.strictEqual(excluder.excludes('node_modules_backup'), false);
		});

		test('a * matches within one path segment only', () => {
			assert.strictEqual(excluder.excludes('notes.code-search'), true);
			assert.strictEqual(excluder.excludes('docs/notes.code-search'), true);
			assert.strictEqual(excluder.excludes('docs/notes.txt'), false);
		});

	});

	suite('glob forms', () => {

		test('a plain name is anchored at the workspace root', () => {
			const excluder = new PathExcluder(['out']);

			assert.strictEqual(excluder.excludes('out'), true);
			// Not the same folder: the glob says the one in the root, not one anywhere.
			assert.strictEqual(excluder.excludes('src/out'), false);
		});

		// "everything under build" has to match build itself as well: the walk asks about the
		// directory, and not descending into it is how its contents are left out.
		test('a trailing /** covers the folder it names', () => {
			const excluder = new PathExcluder(['**/build/**']);

			assert.strictEqual(excluder.excludes('build'), true);
			assert.strictEqual(excluder.excludes('packages/app/build'), true);
			assert.strictEqual(excluder.excludes('src'), false);
		});

		test('braces are alternatives', () => {
			const excluder = new PathExcluder(['**/*.{png,jpg}']);

			assert.strictEqual(excluder.excludes('images/logo.png'), true);
			assert.strictEqual(excluder.excludes('images/logo.jpg'), true);
			assert.strictEqual(excluder.excludes('images/logo.svg'), false);
		});

		test('a ? stands for one character', () => {
			const excluder = new PathExcluder(['log?.txt']);

			assert.strictEqual(excluder.excludes('log1.txt'), true);
			assert.strictEqual(excluder.excludes('log.txt'), false);
			assert.strictEqual(excluder.excludes('log12.txt'), false);
		});

		test('a character class, negated or not', () => {
			assert.strictEqual(new PathExcluder(['log[0-9].txt']).excludes('log7.txt'), true);
			assert.strictEqual(new PathExcluder(['log[0-9].txt']).excludes('logx.txt'), false);
			assert.strictEqual(new PathExcluder(['log[!0-9].txt']).excludes('logx.txt'), true);
			assert.strictEqual(new PathExcluder(['log[!0-9].txt']).excludes('log7.txt'), false);
		});

		// A dot is a literal in a glob and "any character" in a regular expression. Letting it
		// through would make ".git" exclude "agit", "1git" and every other three-plus-one name.
		test('a dot in a glob is a dot, not any character', () => {
			const excluder = new PathExcluder(['**/.git']);

			assert.strictEqual(excluder.excludes('.git'), true);
			assert.strictEqual(excluder.excludes('agit'), false);
			assert.strictEqual(excluder.excludes('xgit'), false);
		});

	});

	suite('what it declines to answer', () => {

		test('nothing is excluded when there are no globs', () => {
			assert.strictEqual(new PathExcluder([]).excludes('node_modules'), false);
			assert.strictEqual(PathExcluder.NOTHING.excludes('node_modules'), false);
		});

		test('an empty or blank glob is ignored rather than matching everything', () => {
			const excluder = new PathExcluder(['', '   ']);

			assert.strictEqual(excluder.excludes('src/a.ts'), false);
			assert.strictEqual(excluder.excludes(''), false);
		});

	});

	// The globs are written with forward slashes whatever the platform, but a path is built with
	// the platform's separator - so on Windows the two have to be brought together before they
	// can be compared at all.
	test('a Windows path is compared the same way as a POSIX one', () => {
		const excluder = new PathExcluder(['**/node_modules']);

		assert.strictEqual(excluder.excludes('packages\\app\\node_modules'), true);
		assert.strictEqual(excluder.excludes('packages/app/node_modules'), true);
	});

});
