"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runManual = process.env.MANUAL_TEST === '1';
describe('Manual Test - Hold', function () {
    if (!runManual) {
        console.log('Skipping manual tests. Set MANUAL_TEST=1 to run them.');
        return;
    }
    it('manual session (keeps window open)', async function () {
        this.timeout(0); // override 20s mocha timeout from .vscode-test.mjs
        console.log('Manual session running. Use the Dev Host window to test your commands.');
        console.log('When done, press Ctrl+C in the terminal to end.');
        await new Promise(() => { }); // never resolves -> dev host stays open
    });
});
//# sourceMappingURL=manual.test.js.map