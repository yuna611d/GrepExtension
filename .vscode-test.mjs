import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	label: 'unitTests',
	files: 'out/test/**/*.test.js',
	workspaceFolder : 'src/test/test-resources/input/',
	mocha: {
		ui: 'tdd',
		timeout: 60000
	}	
});