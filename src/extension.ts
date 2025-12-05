// src/extension.ts
import * as vscode from 'vscode';
import ignore from 'ignore';

export function activate(context: vscode.ExtensionContext) {
  //---------------------------------- helpers ---------------------------------
  const cfg = () => vscode.workspace.getConfiguration('copy-with-path');

  function formatPath(uri: vscode.Uri): string {
    const style = cfg().get<string>('pathType', 'relative');
    return style === 'absolute' ? uri.fsPath : vscode.workspace.asRelativePath(uri, false);
  }

  function wrap(path: string, body: string): string {
    const fenced = cfg().get<boolean>('includeCodeFence', true);
    if (fenced) {
      return [`//path: ${path}`, '```', body, '```'].join('\n');
    }
    return `//path: ${path}\n${body}`;
  }

  function handleError(kind: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error copying ${kind}:`, err);
    vscode.window.showErrorMessage(`Failed to copy ${kind}: ${msg}`);
  }

  async function buildIgnore(folder: vscode.Uri) {
    const ws = vscode.workspace.getWorkspaceFolder(folder);
    if (!ws) {
      return;
    }

    try {
      const giUri = vscode.Uri.joinPath(ws.uri, '.gitignore');
      const txt = Buffer.from(await vscode.workspace.fs.readFile(giUri)).toString('utf8');
      return ignore().add(txt);
    } catch {
      return;
    }
  }

  function collectTargets(primary: vscode.Uri | undefined, selection: vscode.Uri[] | undefined): vscode.Uri[] {
    const items: vscode.Uri[] = [];
    if (Array.isArray(primary)) {
      items.push(...primary);
    } else if (primary) {
      items.push(primary);
    }
    if (selection?.length) {
      items.push(...selection);
    }

    const seen = new Set<string>();
    return items.filter((uri) => {
      const key = uri.toString();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async function readSelectedFiles(targets: vscode.Uri[]) {
    const pieces: string[] = [];
    const skipped: vscode.Uri[] = [];

    for (const target of targets) {
      const stat = await vscode.workspace.fs.stat(target);
      if (stat.type & vscode.FileType.Directory) {
        skipped.push(target);
        continue;
      }
      const content = Buffer.from(await vscode.workspace.fs.readFile(target)).toString('utf8');
      pieces.push(wrap(formatPath(target), content));
    }
    return { pieces, skipped };
  }

  //---------------------------------- file ------------------------------------
  const copyFile = vscode.commands.registerCommand(
    'copy-with-path.copyFileContentWithPath',
    async (uri: vscode.Uri, selection: vscode.Uri[]) => {
      const initial = collectTargets(uri, selection);
      const targets = initial.length
        ? initial
        : vscode.window.activeTextEditor?.document.uri
          ? [vscode.window.activeTextEditor.document.uri]
          : [];

      if (!targets.length) {
        vscode.window.showErrorMessage('Select one or more files first.');
        return;
      }

      try {
        const { pieces, skipped } = await readSelectedFiles(targets);

        if (!pieces.length) {
          vscode.window.showWarningMessage(
            skipped.length
              ? 'No files copied because the selection only contains folders.'
              : 'Select one or more files first.',
          );
          return;
        }

        await vscode.env.clipboard.writeText(pieces.join('\n'));
        const info = skipped.length
          ? `Copied ${pieces.length} file(s). Skipped ${skipped.length} non-file selection(s).`
          : `Copied ${pieces.length} file(s).`;
        vscode.window.showInformationMessage(info);
      } catch (e) {
        handleError('file', e);
      }
    },
  );
  context.subscriptions.push(copyFile);

  const copyFileNoIgnore = vscode.commands.registerCommand(
    'copy-with-path.copyFileContentWithPathNoIgnore',
    async (uri: vscode.Uri, selection: vscode.Uri[]) => {
      // Logic identical to copyFile, calling exact same helper, but separate command ID
      await vscode.commands.executeCommand('copy-with-path.copyFileContentWithPath', uri, selection);
    },
  );
  context.subscriptions.push(copyFileNoIgnore);

  //---------------------------------- folder ----------------------------------
  const copyFolder = vscode.commands.registerCommand(
    'copy-with-path.copyFolderContentWithPath',
    async (uri: vscode.Uri, selection: vscode.Uri[]) => {
      const folders = collectTargets(uri, selection);
      if (!folders.length) {
        vscode.window.showErrorMessage('Select one or more folders first.');
        return;
      }

      try {
        const validFolders: vscode.Uri[] = [];
        const skipped: vscode.Uri[] = [];

        for (const folder of folders) {
          const stat = await vscode.workspace.fs.stat(folder);
          if (stat.type & vscode.FileType.Directory) {
            validFolders.push(folder);
          } else {
            skipped.push(folder);
          }
        }

        if (!validFolders.length) {
          vscode.window.showWarningMessage('No folders copied because the selection only contains files.');
          return;
        }

        const filePaths = new Set<string>();
        const pieces: string[] = [];

        for (const folder of validFolders) {
          const ig = await buildIgnore(folder);
          const relPattern = new vscode.RelativePattern(folder, '**/*');
          const files = (await vscode.workspace.findFiles(relPattern)).filter((f) =>
            ig ? !ig.ignores(vscode.workspace.asRelativePath(f, false)) : true,
          );

          for (const f of files) {
            if (filePaths.has(f.fsPath)) {
              continue;
            }
            filePaths.add(f.fsPath);
            const txt = Buffer.from(await vscode.workspace.fs.readFile(f)).toString('utf8');
            pieces.push(wrap(formatPath(f), txt));
          }
        }

        if (!pieces.length) {
          vscode.window.showWarningMessage('No eligible files to copy.');
          return;
        }

        await vscode.env.clipboard.writeText(pieces.join('\n'));
        const info = skipped.length
          ? `Copied ${filePaths.size} file(s). Skipped ${skipped.length} non-folder selection(s).`
          : `Copied ${filePaths.size} file(s).`;
        vscode.window.showInformationMessage(info);
      } catch (e) {
        handleError('folder', e);
      }
    },
  );
  context.subscriptions.push(copyFolder);

  const copyFolderNoIgnore = vscode.commands.registerCommand(
    'copy-with-path.copyFolderContentWithPathNoIgnore',
    async (uri: vscode.Uri, selection: vscode.Uri[]) => {
      const folders = collectTargets(uri, selection);
      if (!folders.length) {
        vscode.window.showErrorMessage('Select one or more folders first.');
        return;
      }

      try {
        const validFolders: vscode.Uri[] = [];
        const skipped: vscode.Uri[] = [];

        for (const folder of folders) {
          const stat = await vscode.workspace.fs.stat(folder);
          if (stat.type & vscode.FileType.Directory) {
            validFolders.push(folder);
          } else {
            skipped.push(folder);
          }
        }

        if (!validFolders.length) {
          vscode.window.showWarningMessage('No folders copied because the selection only contains files.');
          return;
        }

        const filePaths = new Set<string>();
        const pieces: string[] = [];

        for (const folder of validFolders) {
          // DIFFERENCE: Does not call buildIgnore
          const relPattern = new vscode.RelativePattern(folder, '**/*');
          const files = await vscode.workspace.findFiles(relPattern);

          for (const f of files) {
            if (filePaths.has(f.fsPath)) {
              continue;
            }
            filePaths.add(f.fsPath);
            const txt = Buffer.from(await vscode.workspace.fs.readFile(f)).toString('utf8');
            pieces.push(wrap(formatPath(f), txt));
          }
        }

        if (!pieces.length) {
          vscode.window.showWarningMessage('No eligible files to copy.');
          return;
        }

        await vscode.env.clipboard.writeText(pieces.join('\n'));
        const info = skipped.length
          ? `Copied ${filePaths.size} file(s). Skipped ${skipped.length} non-folder selection(s).`
          : `Copied ${filePaths.size} file(s).`;
        vscode.window.showInformationMessage(info);
      } catch (e) {
        handleError('folder', e);
      }
    },
  );
  context.subscriptions.push(copyFolderNoIgnore);
}

export function deactivate() {}
