import * as vscode from 'vscode';

class FileEntry {
    constructor(
        public readonly uri: vscode.Uri,
        public readonly name: string,
        public readonly isDirectory: boolean,
        public readonly size: number
    ) {}
}

interface CachedDir {
    size: number;
    children: FileEntry[];
}

function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

class FileSizeTreeDataProvider implements vscode.TreeDataProvider<FileEntry> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private cache = new Map<string, CachedDir>();
    private descending: boolean;

    constructor() {
        this.descending = vscode.workspace.getConfiguration('fileSizeExplorer').get<boolean>('sortDescending', true);
    }

    refresh(): void {
        this.cache.clear();
        this.onDidChangeTreeDataEmitter.fire();
    }

    toggleSortOrder(): void {
        this.descending = !this.descending;
        for (const dir of this.cache.values()) {
            dir.children.sort((a, b) => this.descending ? b.size - a.size : a.size - b.size);
        }
        this.onDidChangeTreeDataEmitter.fire();
    }

    getTreeItem(element: FileEntry): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.name,
            element.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
        item.resourceUri = element.uri;
        item.description = formatSize(element.size);
        item.tooltip = `${element.name} — ${formatSize(element.size)}`;
        if (!element.isDirectory) {
            item.command = { command: 'vscode.open', title: 'Open File', arguments: [element.uri] };
        }
        return item;
    }

    async getChildren(element?: FileEntry): Promise<FileEntry[]> {
        if (element) {
            return this.getSortedChildren(element.uri);
        }

        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return [];
        }
        if (folders.length === 1) {
            return this.getSortedChildren(folders[0].uri);
        }

        const roots = await Promise.all(folders.map(async folder => {
            const size = await this.computeDirSize(folder.uri);
            return new FileEntry(folder.uri, folder.name, true, size);
        }));
        roots.sort((a, b) => this.descending ? b.size - a.size : a.size - b.size);
        return roots;
    }

    private getExcludedNames(): Set<string> {
        const config = vscode.workspace.getConfiguration('fileSizeExplorer');
        return new Set(config.get<string[]>('excludeNames', []));
    }

    private async computeDirSize(dirUri: vscode.Uri): Promise<number> {
        const cached = this.cache.get(dirUri.toString());
        if (cached) {
            return cached.size;
        }
        await this.getSortedChildren(dirUri);
        return this.cache.get(dirUri.toString())?.size ?? 0;
    }

    private async getSortedChildren(dirUri: vscode.Uri): Promise<FileEntry[]> {
        const key = dirUri.toString();
        const cached = this.cache.get(key);
        if (cached) {
            return cached.children;
        }

        const excluded = this.getExcludedNames();
        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(dirUri);
        } catch {
            this.cache.set(key, { size: 0, children: [] });
            return [];
        }

        const children: FileEntry[] = [];
        let total = 0;
        for (const [name, type] of entries) {
            if (excluded.has(name)) {
                continue;
            }
            const uri = vscode.Uri.joinPath(dirUri, name);
            const isDirectory = (type & vscode.FileType.Directory) !== 0;
            try {
                const size = isDirectory
                    ? await this.computeDirSize(uri)
                    : (await vscode.workspace.fs.stat(uri)).size;
                children.push(new FileEntry(uri, name, isDirectory, size));
                total += size;
            } catch {
                // Skip entries we can't stat (broken symlinks, permission errors, etc.)
            }
        }

        children.sort((a, b) => this.descending ? b.size - a.size : a.size - b.size);
        this.cache.set(key, { size: total, children });
        return children;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new FileSizeTreeDataProvider();
    const view = vscode.window.createTreeView('fileSizeExplorer.view', { treeDataProvider: provider });

    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => provider.refresh(), 1000);
    };

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidCreate(scheduleRefresh);
    watcher.onDidDelete(scheduleRefresh);
    watcher.onDidChange(scheduleRefresh);

    context.subscriptions.push(
        view,
        watcher,
        vscode.commands.registerCommand('fileSizeExplorer.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('fileSizeExplorer.toggleSortOrder', () => provider.toggleSortOrder())
    );
}

export function deactivate() {}
