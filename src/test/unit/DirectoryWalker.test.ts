import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DirectoryWalker, NumberedFileLine } from '../../Services/DirectoryWalker';
import { FileRepository } from '../../Models/File/FileRepository';
import { SeekedFileModel } from '../../Models/File/SeekedFileModel';

function fakeFile(fields: {
	isDirectory: boolean;
	isFile: boolean;
	FullPath: string;
	Content?: string;
	seemsBinary?: boolean;
}): SeekedFileModel {
	return {
		seemsBinary: false,
		Content: '',
		...fields,
	} as unknown as SeekedFileModel;
}

class FakeFileRepository extends FileRepository {
	constructor(private readonly filesByDir: Record<string, SeekedFileModel[]>) {
		super();
	}
	public retrieve(targetDir: string): SeekedFileModel[] {
		return this.filesByDir[targetDir] ?? [];
	}
}

suite('DirectoryWalker', () => {

	test('invokes onFile with numbered lines for a file it finds', async () => {
		const file = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/a.txt', Content: 'line1\nline2' });
		const walker = new DirectoryWalker(new FakeFileRepository({ '/root': [file] }));

		const seen: NumberedFileLine[][] = [];
		await walker.walk('/root', [], async lines => { seen.push(lines); });

		assert.deepStrictEqual(seen, [[
			{ filePath: '/root/a.txt', lineText: 'line1', lineNumber: 1 },
			{ filePath: '/root/a.txt', lineText: 'line2', lineNumber: 2 },
		]]);
	});

	test('recurses into subdirectories before visiting sibling files', async () => {
		const nestedFile = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/sub/b.txt', Content: 'x' });
		const subDir = fakeFile({ isDirectory: true, isFile: false, FullPath: '/root/sub' });
		const walker = new DirectoryWalker(new FakeFileRepository({
			'/root': [subDir],
			'/root/sub': [nestedFile],
		}));

		const seenPaths: string[] = [];
		await walker.walk('/root', [], async lines => { seenPaths.push(...lines.map(l => l.filePath)); });

		assert.deepStrictEqual(seenPaths, ['/root/sub/b.txt']);
	});

	test('skips files that seemsBinary', async () => {
		const binaryFile = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/bin.dat', Content: 'ignored', seemsBinary: true });
		const walker = new DirectoryWalker(new FakeFileRepository({ '/root': [binaryFile] }));

		let callCount = 0;
		await walker.walk('/root', [], async () => { callCount++; });

		assert.strictEqual(callCount, 0);
	});

	test('does not invoke onFile when the directory is empty', async () => {
		const walker = new DirectoryWalker(new FakeFileRepository({ '/root': [] }));

		let callCount = 0;
		await walker.walk('/root', [], async () => { callCount++; });

		assert.strictEqual(callCount, 0);
	});

	test('numbers lines starting from 1 for every file independently', async () => {
		const fileA = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/a.txt', Content: 'a1\na2' });
		const fileB = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/b.txt', Content: 'b1' });
		const walker = new DirectoryWalker(new FakeFileRepository({ '/root': [fileA, fileB] }));

		const seen: NumberedFileLine[] = [];
		await walker.walk('/root', [], async lines => { seen.push(...lines); });

		assert.deepStrictEqual(seen, [
			{ filePath: '/root/a.txt', lineText: 'a1', lineNumber: 1 },
			{ filePath: '/root/a.txt', lineText: 'a2', lineNumber: 2 },
			{ filePath: '/root/b.txt', lineText: 'b1', lineNumber: 1 },
		]);
	});

	suite('directory cycles', () => {

		test('a directory graph that loops back on itself terminates', async () => {
			const fileInRoot = fakeFile({ isDirectory: false, isFile: true, FullPath: '/root/a.txt', Content: 'lorem' });
			const loopDir = fakeFile({ isDirectory: true, isFile: false, FullPath: '/root/loop' });
			const rootAgain = fakeFile({ isDirectory: true, isFile: false, FullPath: '/root' });
			const walker = new DirectoryWalker(new FakeFileRepository({
				'/root': [loopDir, fileInRoot],
				'/root/loop': [rootAgain],
			}));

			const seen: string[] = [];
			await walker.walk('/root', [], async lines => { seen.push(...lines.map(l => l.filePath)); });

			// /root is entered once, so descending back into it is skipped and the sibling file is
			// still reached.
			assert.deepStrictEqual(seen, ['/root/a.txt']);
		});

	});

	// Real symlinks on a real directory, because the point of the fix is that two routes to one
	// directory resolve to the same path - which a fake repository keyed by path string cannot show.
	suite('symlinked directories', () => {

		let root = '';
		let links: string[] = [];

		setup(() => {
			root = fs.mkdtempSync(path.join(os.tmpdir(), 'g2f-walk-'));
			links = [];
		});

		teardown(() => {
			// Drop the links before deleting the tree. A recursive delete of a directory that still
			// holds a link back into itself fails on Windows - the junction cannot be resolved - and
			// removing a directory link needs unlink on POSIX but rmdir on Windows.
			for (const link of links) {
				try {
					fs.unlinkSync(link);
				} catch {
					fs.rmdirSync(link);
				}
			}
			fs.rmSync(root, { recursive: true, force: true });
		});

		// 'junction' is what Windows needs to link a directory without elevated privileges, and is
		// ignored on every other platform.
		function linkDirectory(target: string, linkPath: string): void {
			fs.symlinkSync(target, linkPath, 'junction');
			links.push(linkPath);
		}

		async function walkedFileNames(): Promise<string[]> {
			const seen: string[] = [];
			await new DirectoryWalker().walk(root, [], async lines => {
				seen.push(...lines.map(l => path.basename(l.filePath)));
			});
			return seen;
		}

		test('a link pointing back at its own parent does not abort the walk', async () => {
			fs.writeFileSync(path.join(root, 'a.txt'), 'lorem');
			linkDirectory(root, path.join(root, 'loop'));

			// This used to descend loop/loop/loop/... until the OS answered ELOOP. The error escaped
			// the whole walk, and since directories are recursed into before sibling files are read,
			// it escaped before a single file had been grepped.
			assert.deepStrictEqual(await walkedFileNames(), ['a.txt']);
		});

		test('a link whose target is gone is stepped over rather than fatal', async () => {
			fs.writeFileSync(path.join(root, 'a.txt'), 'lorem');
			linkDirectory(path.join(root, 'nowhere'), path.join(root, 'dangling'));

			// statSync follows the link and throws ENOENT. That used to escape the walk, and since
			// directories are recursed into before sibling files are read, a.txt was never grepped.
			assert.deepStrictEqual(await walkedFileNames(), ['a.txt']);
		});

		test('two links to the same directory report its files once', async () => {
			const shared = path.join(root, 'shared');
			fs.mkdirSync(shared);
			fs.writeFileSync(path.join(shared, 'b.txt'), 'lorem');
			linkDirectory(shared, path.join(root, 'link1'));
			linkDirectory(shared, path.join(root, 'link2'));

			assert.deepStrictEqual(await walkedFileNames(), ['b.txt']);
		});

	});

});
