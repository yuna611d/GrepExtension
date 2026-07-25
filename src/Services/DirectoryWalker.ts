import { FileRepository } from '../Models/File/FileRepository';
import { SeekedFileModel } from '../Models/File/SeekedFileModel';
import { LineMatcher } from './LineMatcher';

export interface NumberedFileLine { filePath: string; lineText: string; lineNumber: number }

export class DirectoryWalker {

    protected fileRepository: FileRepository = new FileRepository();

    /**
     * Recursively walk targetDir, invoking onFile with the numbered lines of every non-binary file found.
     */
    public async walk(
        targetDir: string,
        excludedFileNames: string[],
        onFile: (lines: NumberedFileLine[]) => Promise<void>
    ) {
        const seekedFilesOrDirectories = this.fileRepository.retrieve(targetDir, excludedFileNames);

        // if file path is directory, re-walk by using file path as the next target directory
        const directories = seekedFilesOrDirectories.filter(target => target.isDirectory);
        for (const target of directories) {
            await this.walk(target.FullPath, excludedFileNames, onFile);
        }

        // if file path is file, read file and pass its lines to onFile
        const files = seekedFilesOrDirectories.filter(f => f.isFile).filter(f => !f.seemsBinary);
        for (const f of files) {
            await onFile(this.readContent(f));
        }
    }

    protected readContent(file: SeekedFileModel, startLine?: number): NumberedFileLine[] {
        const start = (startLine === undefined) ? 0 : startLine;
        return LineMatcher.splitIntoNumberedLines(file.Content, start)
                           .map(v => ({ filePath: file.FullPath, ...v }));
    }

}
