import * as fs from 'fs';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { SeekedFileModel } from './SeekedFileModel';

export class FileRepository {
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();

    public async retrieve(targetDir: string, excludedFullPaths: string[]): Promise<SeekedFileModel[]> {
        // Skip if file name is ignored file or directory
        const entryNames = await fs.promises.readdir(targetDir);
        return entryNames
            .map(file => { return this.seekedFileModelFactory.retrieve(file, targetDir, excludedFullPaths);})
            .filter(file => {return !file.isIgnoredFileOrDirectory();});
    }

}