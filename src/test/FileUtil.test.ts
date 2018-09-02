import * as assert from 'assert';
import * as sinon from 'sinon';
import * as myExtension from '../Utilities/FileUtil';
import { Configuration } from '../Configuration';

suite("FileUtil Factory Tests", function () {

    // Defines a Mocha unit test
    test("Factory Test", () => {
        
        let instance = new Configuration();
        let stub = sinon.stub(instance);
        let sut = new myExtension.FileUtilFactory(stub);
        let obj = sut.retrieve();

        let actual = obj.constructor.name;
        let expected = 'FileUtil';

        assert.equal(actual, expected);

    });

});

suite("FileUtil Tests", function () {

    // Defines a Mocha unit test
    test("txt file is not excluded by dfault Test", () => {
        
        let instance = new Configuration();
        let factory = new myExtension.FileUtilFactory(instance);
        let sut = factory.retrieve();

        let actual = sut.isExcludedFile("sample.txt");
        let expected = false;

        assert.equal(actual, expected);
    });

    test("bin, sln, dll files are excluded by dfault Test", () => {
        
        let instance = new Configuration();
        let factory = new myExtension.FileUtilFactory(instance);
        let sut = factory.retrieve();

        let expected = true;

        let actual = sut.isExcludedFile("sample.bin");
        assert.equal(actual, expected);
        actual = sut.isExcludedFile("sample.dll");
        assert.equal(actual, expected);
        actual = sut.isExcludedFile("sample.sln");
        assert.equal(actual, expected);
    });

    test("result file is excluded by dfault Test", () => {
        
        let instance = new Configuration();
        let factory = new myExtension.FileUtilFactory(instance);
        let sut = factory.retrieve();

        let expected = true;

        let actual = sut.isExcludedFile("grep2File.g2f.txt");
        assert.equal(actual, expected);
    });

});