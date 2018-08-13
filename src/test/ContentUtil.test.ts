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
        let obj = sut.retrieveContentUtil();
        let actual = obj.constructor.name;
        let expected = 'ContentUtil'
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for csv", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('csv');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieveContentUtil();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilCSV'
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for tsv", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('tsv');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieveContentUtil();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilTSV'
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });

    test("Factory for json", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        stub.getOutputContentFormat.returns('json');

        let sut = new myExtension.ContentUtilFactory(stub);
        let obj = sut.retrieveContentUtil();
        let actual = obj.constructor.name;
        let expected = 'ContentUtilJSON'
        stub.getOutputContentFormat.restore();

        assert.equal(actual, expected);

    });
});