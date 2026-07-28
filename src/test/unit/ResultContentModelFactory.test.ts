import * as assert from 'assert';
import { ResultContentModelFactory } from '../../ModelFactories/ResultContentModelFactory';
import { ResultContentModel } from '../../Models/Content/ResultContent/ResultContentModel';
import { ResultContentTSVModel } from '../../Models/Content/ResultContent/ResultContentTSVModel';
import { ResultContentCSVModel } from '../../Models/Content/ResultContent/ResultContentCSVModel';
import { ResultContentJSONModel } from '../../Models/Content/ResultContent/ResultContentJSONModel';
import { ResultFileModel } from '../../Models/File/ResultFileModel';
import { FakeDao } from '../testUtils/FakeDao';

function resultFileWithFormat(format: string): ResultFileModel {
	return new ResultFileModel(new FakeDao({ outputContentFormat: format }));
}

suite('ResultContentModelFactory', () => {

	test('retrieves ResultContentModel for "txt"', () => {
		const model = new ResultContentModelFactory(resultFileWithFormat('txt')).retrieve();
		assert.strictEqual(model.constructor, ResultContentModel);
	});

	test('retrieves ResultContentTSVModel for "tsv"', () => {
		const model = new ResultContentModelFactory(resultFileWithFormat('tsv')).retrieve();
		assert.ok(model instanceof ResultContentTSVModel);
	});

	test('retrieves ResultContentCSVModel for "csv"', () => {
		const model = new ResultContentModelFactory(resultFileWithFormat('csv')).retrieve();
		assert.ok(model instanceof ResultContentCSVModel);
		assert.ok(!(model instanceof ResultContentTSVModel));
	});

	test('retrieves ResultContentJSONModel for "json"', () => {
		const model = new ResultContentModelFactory(resultFileWithFormat('json')).retrieve();
		assert.ok(model instanceof ResultContentJSONModel);
	});

	test('falls back to the plain ResultContentModel for an unrecognized format', () => {
		// A real ResultFileModel normalizes unknown formats to "txt" itself, which would only
		// exercise that fallback rather than the factory's own. Use a stub with an out-of-map
		// FileExtension to drive the factory's `?? ResultContentModel` branch directly.
		const stubResultFile = { FileExtension: 'does-not-exist' } as unknown as ResultFileModel;
		const model = new ResultContentModelFactory(stubResultFile).retrieve();
		assert.strictEqual(model.constructor, ResultContentModel);
	});

	test('falls back to ResultContentModel when no resultFile is provided', () => {
		const model = new ResultContentModelFactory(null as unknown as ResultFileModel).retrieve();
		assert.strictEqual(model.constructor, ResultContentModel);
	});

});
