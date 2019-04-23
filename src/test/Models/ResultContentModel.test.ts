import * as assert from 'assert';
import { ResultContentModelFactory } from '../../ModelFactories/ResultContentModelFactory';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { TestUtility } from '../TestUtility';

suite("ResultContentModel Factory Tests", function () {

    // Defines a Mocha unit test
    test("Factory should return ResultContentModel when specified FileExtension is txt", () => {
        
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "txt";
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultContentModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ResultContentCSVModel when specified FileExtension is csv" , () => {
        
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "csv";
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultContentCSVModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ResultContentTSVModel when specified FileExtension is tsv", () => {
        
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "tsv";
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultContentTSVModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ResultContentJSONModel when specified FileExtension is json", () => {

        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "json";
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultContentJSONModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ResultContentModel when not allowed FileExtension is passed", () => {
        TestUtility.setupDao();
        TestUtility.Settings.outputContentFormat = "Not allowed format";
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ResultContentModel';

        assert.equal(actual, expected);

    });

});

suite("ResultContentModel Content Title Tests", () => {

    const baseDir = "/tmp/";
    const searchWord = "test";
    const isRegExpMode = false;
    const wordFindConfig = {searchWord: searchWord, isRegExpMode: isRegExpMode};

    test("Contents Title should be outputted by default", () => {

        TestUtility.setupDao();
        const stub = new FileModelFactory().retrieve();  //just a dummy object but say stub

        const sut = new ResultContentModelFactory(stub).retrieve();
        sut.setGrepConditionText(baseDir, wordFindConfig);

        const actual = sut.Title;
        const expected = 
`Search Dir: /tmp/
Search Word: test
RegExpMode: OFF`;
        assert.equal(actual, expected);
    });
    test("Contents Title should not be outputted if true is specified", () => {

        TestUtility.setupDao();
        TestUtility.Settings.outputTitle = true;
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub).retrieve();
        sut.setGrepConditionText(baseDir, wordFindConfig);

        const actual = sut.Title;
        const expected = 
`Search Dir: /tmp/
Search Word: test
RegExpMode: OFF`;
        assert.equal(actual, expected);
    });
    test("Contents Title should not be outputted if false is specified", () => {

        TestUtility.setupDao();
        TestUtility.Settings.outputTitle = false;
        const stub = new FileModelFactory().retrieve();

        const sut = new ResultContentModelFactory(stub).retrieve();
        sut.setGrepConditionText(baseDir, wordFindConfig);

        const actual = sut.Title;
        const expected = "";
        assert.equal(actual, expected);
    });
});



// suite("GetContent Test", () => {



//     let baseDir = "/tmp/";
//     let searchWord = "test";
//     let isRegExpMode = false;
//     let wordFindConfig = {searchWord: searchWord, isRegExpMode: isRegExpMode};


//     let filePath = baseDir + "samplefile.txt";
//     let lineNumber = 1;
//     let line = "This is test text";


//     test("GetContent when normal search of txt", () => {
//         // let instance = new Configuration();
//         // let stub = sinon.stub(instance);
//         // stub.getOutputContentFormat.returned('txt');
//         // stub.isOutputTitle.returned(false);

//         const stub = new Configuration();
//         stub._outputContentFormat = 'txt';
//         stub._isOutputTitle = false;

//         let factory = new myExtension.ContentModelFactory(stub);
//         let sut = factory.retrieve();
//         sut.setGrepConf(baseDir, wordFindConfig);

//         let actual = sut.getContent(filePath, lineNumber.toString(), line);
//         let expected = ["", filePath, lineNumber.toString(), line].join("\t");

//         // stub.getOutputContentFormat.restore();
//         // stub.isOutputTitle.restore();

//         assert.equal(actual, expected);
//     });

//     test("GetContent when normal search of csv", () => {

//         // let instance = new Configuration();
//         // let stub = sinon.stub(instance);
//         // stub.getOutputContentFormat.returns('csv');

//         const stub = new Configuration();
//         stub._outputContentFormat = 'csv';
//         stub._isOutputTitle = false;

//         let factory = new myExtension.ContentModelFactory(stub);
//         let sut = factory.retrieve();
//         sut.setGrepConf(baseDir, wordFindConfig);

//         let actual = sut.getContent(filePath, lineNumber.toString(), line);
//         let expected = [filePath, lineNumber.toString(), line].join(",");

//         // stub.getOutputContentFormat.restore();
//         // stub.isOutputTitle.restore();

//         assert.equal(actual, expected);
//     });

//     test("GetContent when normal search of tsv", () => {

//         // let instance = new Configuration();
//         // let stub = sinon.stub(instance);
//         // stub.getOutputContentFormat.returns('tsv');

//         const stub = new Configuration();
//         stub._outputContentFormat = 'tsv';
//         stub._isOutputTitle = false;

//         let factory = new myExtension.ContentModelFactory(stub);
//         let sut = factory.retrieve();
//         sut.setGrepConf(baseDir, wordFindConfig);

//         let actual = sut.getContent(filePath, lineNumber.toString(), line);
//         let expected = [filePath, lineNumber.toString(), line].join("\t");

//         // stub.getOutputContentFormat.restore();
//         // stub.isOutputTitle.restore();

//         assert.equal(actual, expected);
//     });

// });

