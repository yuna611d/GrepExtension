import * as assert from 'assert';
// import * as sinon from 'sinon';
import * as myExtension from '../../Utilities/ContentUtil';
import { ConfigurationStub as Configuration } from '../Configurations/ConfigurationStub';

suite("ContentUtil Factory Tests", function () {

    // Defines a Mocha unit test
    test("Factory for txt", () => {
        
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('txt');
        const stub = new Configuration();
        stub._outputContentFormat = 'txt';

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtil';
        // stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for csv", () => {
        
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('csv');

        const stub = new Configuration();
        stub._outputContentFormat = 'csv';

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilCSV';
        // stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for tsv", () => {
        
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('tsv');

        const stub = new Configuration();
        stub._outputContentFormat = 'tsv';

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilTSV';
        // stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for json", () => {
        
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('json');

        const stub = new Configuration();
        stub._outputContentFormat = 'json';

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilJSON';
        // stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for not alowed format", () => {
        
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('Not Allowed Format');

        const stub = new Configuration();
        stub._outputContentFormat = 'Not Allowed Format';

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtil';
        // stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

});

suite("GetContent Test", () => {

    let baseDir = "/tmp/";
    let searchWord = "test";
    let isRegExpMode = false;
    let wordFindConfig = {searchWord: searchWord, isRegExpMode: isRegExpMode};


    let filePath = baseDir + "samplefile.txt";
    let lineNumber = 1;
    let line = "This is test text";


    test("GetContent when normal search of txt", () => {
        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returned('txt');
        // stub.isOutputTitle.returned(false);

        const stub = new Configuration();
        stub._outputContentFormat = 'txt';
        stub._isOutputTitle = false;

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, wordFindConfig);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = ["", filePath, lineNumber.toString(), line].join("\t");

        // stub.getOutputContentFormat.restore();
        // stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

    test("GetContent when normal search of csv", () => {

        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('csv');

        const stub = new Configuration();
        stub._outputContentFormat = 'csv';
        stub._isOutputTitle = false;

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, wordFindConfig);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = [filePath, lineNumber.toString(), line].join(",");

        // stub.getOutputContentFormat.restore();
        // stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

    test("GetContent when normal search of tsv", () => {

        // let instance = new Configuration();
        // let stub = sinon.stub(instance);
        // stub.getOutputContentFormat.returns('tsv');

        const stub = new Configuration();
        stub._outputContentFormat = 'tsv';
        stub._isOutputTitle = false;

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, wordFindConfig);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = [filePath, lineNumber.toString(), line].join("\t");

        // stub.getOutputContentFormat.restore();
        // stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

});

