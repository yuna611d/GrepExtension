import * as assert from 'assert';
import * as myExtension from '../Configurations/Configuration';

suite("Configuration Tests", function () {

    // Defines a Mocha unit test
    test("Default configuration of exclude", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getExcludedFileExtensions();
        let expected = ["bin", "dll", "sln"];

        assert.equal(actual.length, expected.length);
        assert.deepEqual(actual, expected);
    });

    test("Default configuration of outputFileName", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.getOutputFileName();
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

    test("Default configuration of ignoreHiddenFile", () => {
        let sut = new myExtension.Configuration();
        let actual = sut.ignoreHiddenFile();
        let expected = true;

        assert.equal(actual, expected);
    });
});