# VS Code Extension Development: Troubleshooting & Setup Log

**Project:** Copy with Path Comment (VS Code Extension)
**Tech Stack:** TypeScript, Node.js, PNPM, VSCE, Mocha

## 1. Package Management (PNPM)
**Problem:**
The VS Code packaging tool (`vsce`) and older scripts were hardcoded for `npm`. When switching to `pnpm`, errors occurred (e.g., `npm error missing: nyc...`) because `pnpm` uses a symlinked `node_modules` structure that standard tools often fail to read.

**Solution: Force Hoisting**
We configured `pnpm` to create a flat `node_modules` folder (similar to npm) to ensure compatibility with VS Code tooling.

1.  Created `.npmrc` file in the root:
    ```properties
    node-linker=hoisted
    ```
2.  Cleaned and reinstalled:
    ```bash
    rm -rf node_modules pnpm-lock.yaml
    pnpm install
    ```

## 2. Packaging (`vsce`)
**Problem A: Missing Dependencies**
After packaging the `.vsix`, the extension crashed with `Cannot find module 'ignore'`. This happened because `vsce` ignored the symlinked dependencies or the `.vscodeignore` file was too aggressive.

**Solution:**
1.  Applied the **Hoisting** fix (see Section 1).
2.  Updated `.vscodeignore` to explicitly include the required runtime package while ignoring dev tools:
    ```gitignore
    # Ignore all node_modules...
    node_modules/**
    # ...BUT keep the 'ignore' package
    !node_modules/ignore/**
    ```
3.  Packaged using: `pnpm run package` (which runs `vsce package`).

**Problem B: Dependency Conflict (`lru-cache`)**
A `TypeError: lru_cache_1.LRUCache is not a constructor` occurred during packaging. This was caused by a version conflict between `@vscode/vsce` and the `glob` library used for testing.

**Solution:**
1.  Updated `vsce` to the latest version: `pnpm add -D @vscode/vsce@latest`.
2.  Performed a clean install (`rm -rf node_modules`).

## 3. Linting & Formatting
**Problem:**
Errors like `Definition for rule '@typescript-eslint/semi' was not found`. This occurred because `typescript-eslint` (v8+) removed formatting rules in favor of using **Prettier**.

**Solution:**
1.  Installed Prettier: `pnpm add -D prettier eslint-config-prettier`.
2.  Updated `.eslintrc.json` to remove specific formatting rules (like `semi`) and extend `"prettier"` as the last item.
3.  Created `.prettierrc` to handle code style (indentation, quotes).

## 4. Testing in Headless Environment
**Problem:**
When running tests (`pnpm test`) in a Linux/Docker environment, the error `code: error while loading shared libraries: libatk-1.0.so.0` appeared. VS Code requires GUI libraries even for automated tests.

**Solution:**
1.  Installed system dependencies (Debian/Ubuntu example):
    ```bash
    apt-get install -y libatk1.0-0 libgtk-3-0 libnss3 libasound2 libxss1 xvfb
    ```
2.  Ran tests using `xvfb-run` (virtual display) in `package.json`:
    ```json
    "test": "pnpm run compile && xvfb-run -a vscode-test"
    ```

## 5. New Features Implemented
**Feature: `.copyignore` support**
Modified `src/extension.ts` to read a user-defined `.copyignore` file. The extension now combines rules from `.gitignore` AND `.copyignore` to filter out unwanted files (like `*.spec.ts`) during folder copying.

## 6. Quick Reference Commands

| Action | Command |
| :--- | :--- |
| **Install Dependencies** | `pnpm install` |
| **Compile TS** | `pnpm run compile` |
| **Run Tests** | `pnpm test` |
| **Package VSIX** | `pnpm run package` |
| **Install VSIX locally** | `code --install-extension my-tool.vsix --force` |