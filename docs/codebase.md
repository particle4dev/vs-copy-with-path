# How VS Code Extensions Work: A Short Tutorial

Extensions in VS Code are essentially **Node.js applications** that run in a "sidecar" process. They don't run directly inside the main editor window to prevent them from freezing the UI.

Here are the 3 pillars that make your "Copy with Path" extension work.

### 1. The Blueprint (`package.json`)
Before VS Code runs a single line of your code, it reads your `package.json`. This is the "static declaration." It tells VS Code what your extension *can* do without actually loading it.

*   **Contribution Points (`contributes`):**
    You told VS Code: *"Hey, add a menu item to the Explorer context menu, and give it the ID `copy-with-path.copyFolder...`"*.
    VS Code renders this button immediately, even if your code isn't running yet.
*   **Activation Events (`activationEvents`):**
    You tell VS Code *when* to wake up your extension.
    *   *Old way:* `onCommand:copy-with-path...` (Wake up when clicked).
    *   *New way:* VS Code infers this automatically from your commands.

### 2. The Sandbox (The Extension Host)
VS Code runs on a multi-process architecture:

1.  **Main Process:** The UI (Explorer, Editor, Sidebar).
2.  **Extension Host:** A separate Node.js process where **ALL** extensions run.

**Why this matters:**
*   If your extension loops forever or crashes (like when we had the `ignore` module error), it creates an error notification, but **it does not crash VS Code**.
*   You have access to Node.js APIs (like `fs` to read files) and the VS Code API (`vscode`).

### 3. The Lifecycle (`src/extension.ts`)

When the user clicks your context menu item, the following happens:

#### A. Activation
VS Code sees the user clicked a command linked to your extension. It finds your `main` file (`out/extension.js`) and calls the `activate(context)` function.

#### B. Registration
Inside `activate`, you map the **Command ID** (string) to a **Function** (logic).

```typescript
// definition
const disposable = vscode.commands.registerCommand('my.command.id', () => {
    console.log("Hello!");
});

// clean-up list
context.subscriptions.push(disposable);
```

*   **`registerCommand`**: Binds the ID from `package.json` to your code.
*   **`context.subscriptions`**: A list of things to clean up when the extension stops. If you don't push to this, you might cause memory leaks.

#### C. Execution (The API)
Your function runs using the `vscode` global object to interact with the editor.
*   `vscode.workspace.fs`: Read/Write files.
*   `vscode.env.clipboard`: Access system clipboard.
*   `vscode.window.showInformationMessage`: Show those little toast notifications.

#### D. Deactivation
When VS Code closes, it calls `deactivate()`. This is usually empty, but it's where you'd close database connections or stop background servers if you had them.

---

### Summary: The "Life of a Click"

1.  **User right-clicks a folder.**
    *   *VS Code:* "I see a contribution in `package.json` for this menu. I'll draw the button."
2.  **User clicks "Copy Folder Content".**
    *   *VS Code:* "This command belongs to extension `copy-with-path`. Is it running? No. Start the Extension Host process for it."
3.  **Extension Loads.**
    *   *Extension:* Runs `activate()`. Registers the logic.
4.  **Command Executes.**
    *   *Extension:* Reads files, ignores `.gitignore`, formats text, puts it on clipboard.
5.  **Extension Sleeps.**
    *   Your extension stays active in memory in case the user clicks again, until VS Code is closed.