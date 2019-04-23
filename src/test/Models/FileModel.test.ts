import * as assert from 'assert';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { TestUtility } from '../TestUtility';

suite("File Factory Tests", function () {


    // Defines a Mocha unit test
    test("Factory should return ResultFileModel when no parameter is passed.", () => {

        const sut = new FileModelFactory();
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultFileModel';

        assert.equal(actual, expected);

    });

    test("Factory should return SeekedFileModel when valid parameters are passed.", () => {

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
        assert.equal(obj.FullPath, "dir1/file1.txt", "FilePath is checked");
    });
});

suite("ResultFileModel Tests", function() {

    // beforeEach(() => {
    //     resetSettingStub();
    // });


    // file format
    test("resultFile format should be txt by default", () => {
        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        const expected = "txt";
        assert.equal(actual, expected);
    });
    test("txt should be allowed format", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "txt";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        const expected = "txt";
        assert.equal(actual, expected,   "txt is default allowed format");
    });
    test("csv should be allowed format", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "csv";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        const expected = "csv";
        assert.equal(actual, expected,   "csv is allowed format");
    });
    test("tsv should be allowed format", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "tsv";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        const expected = "tsv";        
        assert.equal(actual, expected,   "tsv is allowed format");
    });
    test("json should be allowed format", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "json";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        assert.equal(actual, "json",  "json is allowed format");
    });
    test("xxx should not be allowed format", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "xxx";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileExtension;
        const expected = "xxx";
        assert.notEqual(actual, expected,  "xxx is not allowed format");
    });

    // file name
    test("default file name should be grep2File.g2f.txt", () => {
        TestUtility.setupDao();

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileNameWithExtension;
        const expected = "grep2File.g2f.txt";
        assert.equal(actual, expected);
    });
    test("file name should be grep2File.g2f.txt if specified file name is empty", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputFileName = "";

        const sut = new FileModelFactory().retrieve();
        const actual = sut.FileNameWithExtension;
        const expected = "grep2File.g2f.txt";
        assert.equal(actual, expected);
    });

    // TODO operational functionality test will be implemented.

});


// suite("FileUtil Tests", function () {

//     // Defines a Mocha unit test
//     test("txt file is not excluded by default Test", () => {
        
//         let instance = new Configuration();
//         let factory = new myExtension.FileUtilFactory(instance);
//         let sut = factory.retrieve();

//         let actual = sut.isExcludedFile("sample.txt");
//         let expected = false;

//         assert.equal(actual, expected);
//     });

//     test("bin, sln, dll files are excluded by default Test", () => {
        
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

//     test("result file is excluded by default Test", () => {
        
//         let instance = new Configuration();
//         let factory = new myExtension.FileUtilFactory(instance);
//         let sut = factory.retrieve();

//         let expected = true;

//         let actual = sut.isExcludedFile("grep2File.g2f.txt");
//         assert.equal(actual, expected);
//     });

// });