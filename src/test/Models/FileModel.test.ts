import * as assert from 'assert';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';

suite("File Factory Tests", function () {

    // Defines a Mocha unit test
    test("Factory should return ResultFileModel when no parameter is passed.", () => {

        const sut = new FileModelFactory();
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultFileModel';

        assert.equal(actual, expected);

    });

    test("Factory should return SeekedFileModel when valid parameteres are passed.", () => {

        const fileName = "file1.txt";
        const targetDir = "dir1";
        const resultFile = new FileModelFactory().retrieve();

        const sut = new FileModelFactory();
        const obj = sut.retrieve(fileName, targetDir, resultFile);
        const actual = obj.constructor.name;
        const expected = 'SeekedFileModel';

        assert.equal(actual, expected,               "Type is checked");
        assert.equal(obj.FileName, "file1",          "FileName is checked");
        assert.equal(obj.FileExtension, "txt",       "FileExtension is checked");
        assert.equal(obj.FileNameWithExtension,      "file1.txt", "FileNameWithExtension is checked");
        assert.equal(obj.TargetDir, "dir1",          "TargetDir is checked");
        assert.equal(obj.FilePath, "dir1/file1.txt", "FilePath is checked");
    });
});

// suite("FileUtil Tests", function () {

//     // Defines a Mocha unit test
//     test("txt file is not excluded by dfault Test", () => {
        
//         let instance = new Configuration();
//         let factory = new myExtension.FileUtilFactory(instance);
//         let sut = factory.retrieve();

//         let actual = sut.isExcludedFile("sample.txt");
//         let expected = false;

//         assert.equal(actual, expected);
//     });

//     test("bin, sln, dll files are excluded by dfault Test", () => {
        
//         let instance = new Configuration();
//         let factory = new myExtension.FileUtilFactory(instance);
//         let sut = factory.retrieve();

//         let expected = true;

//         let actual = sut.isExcludedFile("sample.bin");
//         assert.equal(actual, expected);
//         actual = sut.isExcludedFile("sample.dll");
//         assert.equal(actual, expected);
//         actual = sut.isExcludedFile("sample.sln");
//         assert.equal(actual, expected);
//     });

//     test("result file is excluded by dfault Test", () => {
        
//         let instance = new Configuration();
//         let factory = new myExtension.FileUtilFactory(instance);
//         let sut = factory.retrieve();

//         let expected = true;

//         let actual = sut.isExcludedFile("grep2File.g2f.txt");
//         assert.equal(actual, expected);
//     });

// });