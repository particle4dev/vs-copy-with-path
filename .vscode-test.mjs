// .vscode-test.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.spec.js',
  workspaceFolder: 'test-workspace', // We will create this folder
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
});
