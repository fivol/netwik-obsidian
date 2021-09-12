import {NetwikAPI} from "./api";
import {App, Notice, TAbstractFile, TFile} from "obsidian";
import * as path from "path";
import {MarkdownAdapter} from "./mdAdapter";


export class LocalBase {
    app: App
    api: NetwikAPI
    basePath: string
    mdAdapter: MarkdownAdapter

    recentCreatedFiles = new Set()
    creatingFileState = false

    constructor(api: NetwikAPI, app: App, mdAdapter: MarkdownAdapter) {
        this.app = app
        this.api = api
        this.mdAdapter = mdAdapter
        this.basePath = 'w'
        this.checkBaseFolder()

        app.vault.on('modify', file => {
            if (this.isControlledPath(file.path)) {
                this.uploadFile(this.pathToId(file.path));
            }
        })
        app.vault.on('create', file => {
            if (this.isControlledPath(file.path) && !this.recentCreatedFiles.has(file.path) && !this.creatingFileState) {
                this.syncCreatedFile(file);
            }
        })
    }

    private checkBaseFolder() {
        this.app.vault.adapter.stat(this.basePath).then(
            stat => {
                if (!stat) {
                    this.app.vault.createFolder(this.basePath).then(
                        () => {
                            new Notice('Netwik storage created!')
                        }
                    )
                }
            }
        )
    }

    private idToPath(_id: string) {
        return path.join(this.basePath, _id) + '.md';
    }

    async createFile() {
        if (this.recentCreatedFiles.size > 5) {
            this.recentCreatedFiles.clear();
        }
        this.creatingFileState = true;
        const block = await this.api.createBlock({});
        const defaultContent = '# New note\n*Id*: ' + block._id;
        const file = await this.app.vault.create(this.idToPath(block._id), defaultContent);
        this.recentCreatedFiles.add(file.path)

        await this.app.workspace.activeLeaf.openFile(file);
        this.creatingFileState = false;
    }

    syncCreatedFile(file: TAbstractFile) {
        this.api.createBlock(
            {title: this.pathToId(file.path)}
        ).then(
            response => {
                this.app.vault.rename(file, this.idToPath(response._id)).then(
                    () => {
                        new Notice('New file uploaded!')

                    }
                )
            }
        )
    }

    private pathToId(path: string) {
        const match = path.match(/(\w+)\.md/)
        if (!match) {
            return undefined;
        }
        return match[1];
    }

    public syncFile(_id: string) {
        // Make remote and local consistency
        this.app.vault.adapter.stat(this.idToPath(_id)).then(
            stat => {
                if (!stat) {
                    this.downloadFile(_id);
                } else {
                    this.updateFile(_id);
                }
            }
        )
    }

    private isRemoteFile(file: TAbstractFile) {
        return this.isControlledPath(file.path);
    }

    public isControlledPath = (path: string) => {
        const pathPrefix = this.basePath + '/';
        return path.includes(pathPrefix)
    }

    private updateFile(_id: string) {
        // Rewrite all local changes by remote
        this.api.downloadBlock(_id).then(
            block => {
                const data = this.mdAdapter.toMarkdown(block);
                this.app.vault.adapter.write(this.idToPath(_id), data);
            }
        )
    }

    private downloadFile(_id: string) {
        this.api.downloadBlock(_id).then(
            block => {
                const data = this.mdAdapter.toMarkdown(block);
                this.app.vault.create(this.idToPath(_id), data).then(
                    () => {
                        new Notice('File synced: ' + _id);
                    }
                )
            }
        )
    }

    uploadFile(_id: string) {
        // Rewrite remote by local changes

        const uploadBlock = (data: string) => {
            const block = this.mdAdapter.toBlock(data);
            // @ts-ignore
            block._id = _id;
            const response = this.api.uploadBlock(block);
        }

        // Try access current file by cache
        const activeFile = this.app.workspace.getActiveFile()
        if (this.pathToId(activeFile.path) === _id) {
            this.app.vault.cachedRead(activeFile).then(
                data => {
                    uploadBlock(data)
                }
            )
        } else {
            // Read file from fs and upload to remote
            const path = this.idToPath(_id);
            this.app.vault.adapter.read(path).then(
                data => {
                    uploadBlock(data)
                }
            )
        }
    }

    public async deleteCurrentFile() {
        const path = this.app.workspace.getActiveFile().path;
        const _id = this.pathToId(path)
        this.app.vault.delete(this.app.vault.getAbstractFileByPath(path))
        await this.deleteFile(_id);
    }

    async deleteFile(_id: string) {
        await this.api.deleteBlock(_id)
    }
}