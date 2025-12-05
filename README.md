# Copy with Path Comment (VS Code Extension)

A simple Visual Studio Code extension that adds a command to the file explorer context menu to copy the entire content of a file, prepending a comment with the file's relative path.

This is useful for quickly sharing code snippets or file contents while retaining context about where the code came from within a project.
I mainly use for snipping code for sending in LLM chats.

## Features

*   Adds **Copy Content with Path Comment** commands to the Explorer context menu for both files and folders.
*   Copies the full content of each selected file to the clipboard.
*   Automatically prepends a comment line `// path: path/to/your/file.ext` to every copied block, using the path relative to the workspace root.
*   **Respects `.gitignore`** to avoid copying unwanted build artifacts.
*   **Supports `.copyignore`** for custom exclusion rules specific to this extension.
*   Works with Explorer multi-selection so you can pick several files or folders at once.

## Usage

1.  Make sure the extension is installed and enabled in VS Code.
2.  Open a project or folder in VS Code.
3.  Navigate to the Explorer view (the file tree sidebar).
4.  Right-click on the file or folder whose content you want to copy.
5.  Select **"Copy Content with Path Comment"** from the context menu.
6.  The file's content, prefixed with the path comment, is now on your clipboard.
7.  Paste the content wherever you need it (e.g., another file, a document, a chat message).

## Excluding Files (.gitignore & .copyignore)

When copying folders, the extension automatically ignores files listed in your `.gitignore`.

If you want to exclude files that **are** in Git but you don't want to copy (like unit tests, documentation, or config files), you can create a `.copyignore` file in the root of your workspace.

**Example `.copyignore` file:**
```text
# Ignore test files
*.spec.ts
*.test.js
tests/

# Ignore config files
*.json
*.env
```

*Note: The command **"Copy Folder Content (ignore .gitignore)"** will bypass both `.gitignore` and `.copyignore` and copy everything.*

## Multi-select

* You can select multiple files or folders in the Explorer (hold Ctrl/Cmd or Shift) and run the same commands from the context menu.
* When copying multiple files, each file's contents are copied sequentially, prefixed with its path header. Selecting multiple folders aggregates all non-ignored files from each folder (duplicates are removed).

## Configuration

You can customize the extension in VS Code Settings (`Ctrl+,`):

*   **Copy With Path: Path Type**: Choose between `relative` (default) or `absolute` file paths.
*   **Copy With Path: Include Code Fence**: Toggle whether to wrap the content in Markdown code blocks (`` ``` ``). Default is `true`.

## Build & Test

**Build VSIX:**
```bash
vsce package
```

**Run Tests:**
```bash
npm test
# or if using pnpm
pnpm test
```
```