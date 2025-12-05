import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const rootUri = vscode.workspace.workspaceFolders![0].uri;

  // Helper to write file content
  async function createFile(relativePath: string, content: string) {
    const fileUri = vscode.Uri.joinPath(rootUri, relativePath);
    const data = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(fileUri, data);
    return fileUri;
  }

  // Helper to delete file
  async function deleteFile(relativePath: string) {
    const fileUri = vscode.Uri.joinPath(rootUri, relativePath);
    await vscode.workspace.fs.delete(fileUri, { recursive: true, useTrash: false });
  }

  // Wait for clipboard to update (clipboard ops are slightly async in OS)
  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setup(async () => {
    // Clear clipboard before each test
    await vscode.env.clipboard.writeText('');
  });

  test('Copy Single File', async () => {
    const uri = await createFile('test-file.txt', 'Hello World');

    // Open the document so it is "active"
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    // Execute command
    await vscode.commands.executeCommand('my-custom-copy-tool.copyFileContentWithPath', uri, []);

    await sleep(500); // wait for clipboard
    const content = await vscode.env.clipboard.readText();

    assert.ok(content.includes('//path: test-file.txt'), 'Path comment missing');
    assert.ok(content.includes('Hello World'), 'Content missing');

    await deleteFile('test-file.txt');
  });

  test('Copy Folder respects .gitignore', async () => {
    // Setup folder structure
    await createFile('src/main.ts', 'main code');
    await createFile('src/secret.key', 'secret');
    await createFile('.gitignore', 'secret.key');

    const folderUri = vscode.Uri.joinPath(rootUri, 'src');

    // Execute copy folder command
    await vscode.commands.executeCommand('my-custom-copy-tool.copyFolderContentWithPath', folderUri, []);

    await sleep(500);
    const content = await vscode.env.clipboard.readText();

    assert.ok(content.includes('src/main.ts'), 'Should include main.ts');
    assert.ok(!content.includes('src/secret.key'), 'Should IGNORE secret.key based on .gitignore');

    // Cleanup
    await deleteFile('src');
    await deleteFile('.gitignore');
  });

  test('Copy Folder respects .copyignore', async () => {
    // Setup folder structure
    await createFile('tests/app.test.ts', 'test code');
    await createFile('tests/app.ts', 'app code');
    await createFile('.copyignore', '*.test.ts');

    const folderUri = vscode.Uri.joinPath(rootUri, 'tests');

    // Execute copy folder command
    await vscode.commands.executeCommand('my-custom-copy-tool.copyFolderContentWithPath', folderUri, []);

    await sleep(500);
    const content = await vscode.env.clipboard.readText();

    assert.ok(content.includes('tests/app.ts'), 'Should include app.ts');
    assert.ok(!content.includes('tests/app.test.ts'), 'Should IGNORE app.test.ts based on .copyignore');

    // Cleanup
    await deleteFile('tests');
    await deleteFile('.copyignore');
  });
});
