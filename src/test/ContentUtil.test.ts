import * as assert from 'assert';
import * as sinon from 'sinon';
import * as myExtension from '../ContentUtil';
import { Configuration } from '../Configuration';

suite("ContentUtil Factory Tests", function () {

    // Defines a Mocha unit test
    test("Factory for txt", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('txt');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtil';
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for csv", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('csv');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilCSV';
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for tsv", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('tsv');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilTSV';
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for json", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('json');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilJSON';
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for not alowed format", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('Not Allowed Format');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieve();
        let actual = obj.constructor.name;
        let expected = 'ContentUtil';
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

});

suite("GetContent Test", () => {

    let baseDir = "/tmp/";
    let searchWord = "test";
    let isRegExpMode = false;

    let filePath = baseDir + "samplefile.txt";
    let lineNumber = 1;
    let line = "This is test text";


    test("GetContent when normal search of txt", () => {
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returned('txt');
        stub.isOutputTitle.returned(false);

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, searchWord, isRegExpMode);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = ["", filePath, lineNumber.toString(), line].join("\t");

        stub.getOutputContentFormat.restore();
        stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

    test("GetContent when normal search of csv", () => {

        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('csv');

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, searchWord, isRegExpMode);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = [filePath, lineNumber.toString(), line].join(",");

        stub.getOutputContentFormat.restore();
        stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

    test("GetContent when normal search of tsv", () => {

        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('tsv');

        let factory = new myExtension.ContentUtilFactory(stub);
        let sut = factory.retrieve();
        sut.setGrepConf(baseDir, searchWord, isRegExpMode);

        let actual = sut.getContent(filePath, lineNumber.toString(), line);
        let expected = [filePath, lineNumber.toString(), line].join("\t");

        stub.getOutputContentFormat.restore();
        stub.isOutputTitle.restore();

        assert.equal(actual, expected);
    });

});

