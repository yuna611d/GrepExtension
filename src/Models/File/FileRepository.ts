import * as fs from 'fs';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { SeekedFileModel } from './SeekedFileModel';

export class FileRepository {
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();

    public retrieve(targetDir: string, excludedFiles: string[]): SeekedFileModel[] {
        // Skip if file name is ignored file or directory
        const targetFiles = fs.readdirSync(targetDir)
            .map(file => { return this.seekedFileModelFactory.retrieve(file, targetDir, excludedFiles);})
            .filter(file => {return !file.isIgnoredFileOrDirectory();});
        return targetFiles;
    }

}