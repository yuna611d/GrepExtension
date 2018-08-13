import * as assert from 'assert';
import * as os from 'os';
import * as myExtension from '../Configuration';

suite("Configuration Tests", function () {

    // Defines a Mocha unit test
    test("Default configuration of exclude", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getExcludedFileExtension();
        let expected = ["bin", "dll", "sln"];

        assert.equal(actual.length, expected.length);
        assert.deepEqual(actual, expected);
    });

    test("Default configuration of outputFileName", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getOuputFileName();
        let expected = "grep2File.g2f";

        assert.equal(actual, expected);
    });

    test("Default configuration of outputContentFormat", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getOutputContentFormat();
        let expected = "txt";

        assert.equal(actual, expected);
    });

    test("Default configuration of outputTitle", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.isOutputTitle();
        let expected = true;

        assert.equal(actual, expected);
    });

    test("Directory separator", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getDirSeparator();

        let expected = "";
        let osType = os.type();
        if (osType === 'Windows_NT') {
            expected = "\\";
        } else {
            expected = "/";
        }

        assert.equal(actual, expected);
    });
    
});