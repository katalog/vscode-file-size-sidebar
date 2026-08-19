# File Size Explorer

A VS Code extension that adds its own **File Sizes** icon to the Activity Bar, opening a sidebar that lists every file and folder in your workspace sorted by size — largest first by default — so you can spot what's eating up space without leaving the editor.

## Features

- **Dedicated sidebar view** — its own Activity Bar icon opens a "File Sizes" panel, separate from the built-in Explorer, showing every file and folder ordered by size.
- **Folder sizes are aggregated** — a folder's size is the total of everything inside it, computed recursively, so large directories stand out even before you expand them.
- **Click to open** — clicking a file opens it, just like the native Explorer.
- **Toggle sort direction** — flip between largest-first and smallest-first from the view's title bar.
- **Auto-refresh** — the view updates automatically (debounced) when files are created, changed, or deleted.
- **Exclude noisy folders** — `node_modules`, `.git`, build output, etc. are skipped by default and configurable.

## Usage

1. Open a folder or workspace in VS Code.
2. Click the **File Sizes** icon in the Activity Bar (left-hand edge) to open the view.
3. Click the sort icon in its title bar to toggle ascending/descending order, or the refresh icon to recompute sizes on demand.

## Extension Settings

| Setting | Description | Default |
|---|---|---|
| `fileSizeExplorer.sortDescending` | Sort largest files and folders first | `true` |
| `fileSizeExplorer.excludeNames` | File/folder names to skip entirely when computing sizes | `["node_modules", ".git", "out", "dist", "build", ".next", "target", "bin", "obj"]` |

## How it works

Folder sizes require walking the whole subtree, so the first time a directory's contents are listed, the extension recursively sums every file inside it (skipping anything in `excludeNames`). Results are cached per directory, so expanding folders you've already visited is instant — only the refresh command or a file-system change re-walks the tree.

## Known Issues

Very large workspaces (tens of thousands of files) can take a moment to compute on first load, since every folder's aggregate size has to be known up front to sort the top level correctly.

## Installation

Not yet published on the VS Code Marketplace. To build and run it from source:

```bash
git clone https://github.com/katalog/vscode-file-size-sidebar.git
cd vscode-file-size-sidebar
npm install
npm run compile
```

Then open the folder in VS Code and press `F5` to launch an Extension Development Host with the extension active, or package it yourself with [`vsce`](https://github.com/microsoft/vscode-vsce) and install the resulting `.vsix` via **Extensions: Install from VSIX...**.

## Release Notes

### 1.0.0

Stable release — no functional changes from 0.9.0.

### 0.9.0

Initial release: sorted file-size sidebar view with folder aggregation, sort toggle, and auto-refresh.

## License

See [LICENSE](LICENSE).
