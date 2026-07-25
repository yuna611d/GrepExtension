import * as fs from 'fs';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { SeekedFileModel } from './SeekedFileModel';

export class FileRepository {
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();

    public retrieve(targetDir: string, excludedFullPaths: string[]): SeekedFileModel[] {
        // Skip if file name is ignored file or directory
        const targetFiles = fs.readdirSync(targetDir)
            .map(file => { return this.seekedFileModelFactory.retrieve(file, targetDir, excludedFullPaths);})
            .filter(file => {return !file.isIgnoredFileOrDirectory();});
        return targetFiles;
    }

}