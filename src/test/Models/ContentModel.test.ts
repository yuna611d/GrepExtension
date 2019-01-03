import * as assert from 'assert';
import { ResultFileModel } from '../../Models/ResultFileModel';
import { ContentModelFactory } from '../../ModelFactories/ContentModelFactory';
import { FileModelFactory } from '../../ModelFactories/FileModelFactory';
import { Common } from '../../Commons/Common';

suite("ContentModel Factory Tests", function () {

    // Setup
    class ResultFileModelStub extends ResultFileModel {
        _fileExtension: string = "txt";
        _fileName: string = "result" + "." + this._fileExtension;
    }

    // Defines a Mocha unit test
    test("Factory should return ContentModel when specified FileExtension is txt", () => {
        
        const stub = new ResultFileModelStub(Common.DAO);
        stub._fileExtension = "txt";

        const sut = new ContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ContentModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ContentCSVModel when specified FileExtension is csv" , () => {
        
        const stub = new FileModelFactory().retrieve() as ResultFileModelStub;
        stub._fileExtension = 'csv';

        const sut = new ContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ContentCSVModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ContentTSVModel when specified FileExtension is tsv", () => {
        
        const stub = new FileModelFactory().retrieve() as ResultFileModelStub;
        stub._fileExtension = 'tsv';

        const sut = new ContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ContentTSVModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ContentJSONModel when specified FileExtension is json", () => {

        const stub = new FileModelFactory().retrieve() as ResultFileModelStub;
        stub._fileExtension = 'json';

        const sut = new ContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ContentJSONModel';

        assert.equal(actual, expected);

    });

    test("Factory should return ContentModel when not allowed FileExtension is passed", () => {
        
        const stub = new FileModelFactory().retrieve() as ResultFileModelStub;
        stub._fileExtension = 'Not Allowed Format';

        const sut = new ContentModelFactory(stub);
        const obj = sut.retrieve();
        const actual = obj.constructor.name;
        const expected = 'ContentModel';

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

