import { FileRepository } from '../Models/File/FileRepository';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';
import { LineMatcher } from './LineMatcher';

export interface NumberedFileLine { filePath: string; lineText: string; lineNumber: number }

export class DirectoryWalker {

    protected fileRepository: FileRepository;

    constructor(fileRepository: FileRepository = new FileRepository()) {
        this.fileRepository = fileRepository;
    }

    /**
     * Recursively walk targetDir, invoking onFile with the numbered lines of every non-binary file found.
     */
    public async walk(
        targetDir: string,
        excludedFullPaths: string[],
        onFile: (lines: NumberedFileLine[]) => Promise<void>
    ) {
        const seekedFilesOrDirectories = this.fileRepository.retrieve(targetDir, excludedFullPaths);

        // if file path is directory, re-walk by using file path as the next target directory
        const directories = seekedFilesOrDirectories.filter(target => target.isDirectory);
        for (const target of directories) {
            await this.walk(target.FullPath, excludedFullPaths, onFile);
        }

        // if file path is file, read file and pass its lines to onFile
        const files = seekedFilesOrDirectories.filter(f => f.isFile).filter(f => !f.seemsBinary);
        for (const f of files) {
            await onFile(this.readContent(f));
        }
    }

    protected readContent(file: SeekedFileModel): NumberedFileLine[] {
        return LineMatcher.splitIntoNumberedLines(file.Content)
                           .map(v => ({ filePath: file.FullPath, ...v }));
    }

}
