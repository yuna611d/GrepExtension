import * as assert from 'assert';
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

});
