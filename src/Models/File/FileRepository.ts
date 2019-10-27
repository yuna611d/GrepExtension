import * as fs from 'fs';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { SeekedFileModel } from './SeekedFileModel';
import { ResultFileModel } from './ResultFileModel';

export class FileRepository {
    private seekedFileModelFactory: FileModelFactory = new FileModelFactory();

    retriveFiles(targetDir: string, resultFile: ResultFileModel): SeekedFileModel[] {
        // Skip if file name is ignored file or directory
        const targetFiles = fs.readdirSync(targetDir)
            .map(file => { return this.seekedFileModelFactory.retrieve(file, targetDir, resultFile);})
            .filter(file => {return !file.isIgnoredFileOrDirectory();});
        return targetFiles;
    }
}