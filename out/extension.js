"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const ignore_1 = __importDefault(require("ignore"));
const vscode = __importStar(require("vscode"));
function activate(context) {
    //---------------------------------- helpers ---------------------------------
    const cfg = () => vscode.workspace.getConfiguration('copy-with-path');
    function formatPath(uri) {
        const style = cfg().get('pathType', 'relative');
        return style === 'absolute' ? uri.fsPath : vscode.workspace.asRelativePath(uri, false);
    }
    function wrap(path, body) {
        const fenced = cfg().get('includeCodeFence', true);
        if (fenced) {
            return [`//path: ${path}`, '```', body, '```'].join('\n');
        }
        return `//path: ${path}\n${body}`;
    }
    function handleError(kind, err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error copying ${kind}:`, err);
        vscode.window.showErrorMessage(`Failed to copy ${kind}: ${msg}`);
    }
    async function buildIgnore(folder) {
        const ws = vscode.workspace.getWorkspaceFolder(folder);
        if (!ws) {
            return;
        }
        try {
            const giUri = vscode.Uri.joinPath(ws.uri, '.gitignore');
            const txt = Buffer.from(await vscode.workspace.fs.readFile(giUri)).toString('utf8');
            return (0, ignore_1.default)().add(txt);
        }
        catch {
            return;
        }
    }
    function collectTargets(primary, selection) {
        const items = [];
        if (Array.isArray(primary)) {
            items.push(...primary);
        }
        else if (primary) {
            items.push(primary);
        }
        if (selection?.length) {
            items.push(...selection);
        }
        const seen = new Set();
        return items.filter(uri => {
            const key = uri.toString();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async function readSelectedFiles(targets) {
        const pieces = [];
        const skipped = [];
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
    const copyFile = vscode.commands.registerCommand('copy-with-path.copyFileContentWithPath', async (uri, selection) => {
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
                vscode.window.showWarningMessage(skipped.length
                    ? 'No files copied because the selection only contains folders.'
                    : 'Select one or more files first.');
                return;
            }
            await vscode.env.clipboard.writeText(pieces.join('\n'));
            const info = skipped.length
                ? `Copied ${pieces.length} file(s). Skipped ${skipped.length} non-file selection(s).`
                : `Copied ${pieces.length} file(s).`;
            vscode.window.showInformationMessage(info);
        }
        catch (e) {
            handleError('file', e);
        }
    });
    context.subscriptions.push(copyFile);
    // File-level command variant that explicitly ignores .gitignore (same behaviour as file)
    const copyFileNoIgnore = vscode.commands.registerCommand('copy-with-path.copyFileContentWithPathNoIgnore', async (uri, selection) => {
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
                vscode.window.showWarningMessage(skipped.length
                    ? 'No files copied because the selection only contains folders.'
                    : 'Select one or more files first.');
                return;
            }
            await vscode.env.clipboard.writeText(pieces.join('\n'));
            const info = skipped.length
                ? `Copied ${pieces.length} file(s). Skipped ${skipped.length} non-file selection(s).`
                : `Copied ${pieces.length} file(s).`;
            vscode.window.showInformationMessage(info);
        }
        catch (e) {
            handleError('file', e);
        }
    });
    context.subscriptions.push(copyFileNoIgnore);
    //---------------------------------- folder ----------------------------------
    const copyFolder = vscode.commands.registerCommand('copy-with-path.copyFolderContentWithPath', async (uri, selection) => {
        const folders = collectTargets(uri, selection);
        if (!folders.length) {
            vscode.window.showErrorMessage('Select one or more folders first.');
            return;
        }
        try {
            const validFolders = [];
            const skipped = [];
            for (const folder of folders) {
                const stat = await vscode.workspace.fs.stat(folder);
                if (stat.type & vscode.FileType.Directory) {
                    validFolders.push(folder);
                }
                else {
                    skipped.push(folder);
                }
            }
            if (!validFolders.length) {
                vscode.window.showWarningMessage('No folders copied because the selection only contains files.');
                return;
            }
            const filePaths = new Set();
            const pieces = [];
            for (const folder of validFolders) {
                const ig = await buildIgnore(folder);
                const relPattern = new vscode.RelativePattern(folder, '**/*');
                const files = (await vscode.workspace.findFiles(relPattern)).filter(f => ig ? !ig.ignores(vscode.workspace.asRelativePath(f, false)) : true);
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
        }
        catch (e) {
            handleError('folder', e);
        }
    });
    context.subscriptions.push(copyFolder);
    // Copy folder contents without respecting .gitignore
    const copyFolderNoIgnore = vscode.commands.registerCommand('copy-with-path.copyFolderContentWithPathNoIgnore', async (uri, selection) => {
        const folders = collectTargets(uri, selection);
        if (!folders.length) {
            vscode.window.showErrorMessage('Select one or more folders first.');
            return;
        }
        try {
            const validFolders = [];
            const skipped = [];
            for (const folder of folders) {
                const stat = await vscode.workspace.fs.stat(folder);
                if (stat.type & vscode.FileType.Directory) {
                    validFolders.push(folder);
                }
                else {
                    skipped.push(folder);
                }
            }
            if (!validFolders.length) {
                vscode.window.showWarningMessage('No folders copied because the selection only contains files.');
                return;
            }
            const filePaths = new Set();
            const pieces = [];
            for (const folder of validFolders) {
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
        }
        catch (e) {
            handleError('folder', e);
        }
    });
    context.subscriptions.push(copyFolderNoIgnore);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map