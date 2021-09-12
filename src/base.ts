import {NetwikAPI} from "./api";
import {App, Notice, TAbstractFile, TFile} from "obsidian";
import * as path from "path";
import {MarkdownAdapter} from "./mdAdapter";


export class LocalBase {
    app: App
    api: NetwikAPI
    basePath: string
    mdAdapter: MarkdownAdapter

    constructor(api: NetwikAPI, app: App, mdAdapter: MarkdownAdapter) {
        this.app = app
        this.api = api
        this.mdAdapter = mdAdapter
        this.basePath = 'w'
        this.checkBaseFolder()

        app.vault.on('modify', file => {
            if (this.isRemoteFile(file)) {
                this.uploadFile(this.pathToId(file.path));
            }
        })
        app.vault.on('create', file => {
            if (this.isRemoteFile(file)) {
                this.syncFile(file.path);
            }
        })
    }

    private checkBaseFolder() {
        this.app.vault.adapter.stat(this.basePath).then(
            stat => {
                if(!stat){
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

    private pathToId(path: string) {
        const match = path.match('(\w)+.md')
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
        const pathPrefix = this.basePath + '/';
        return file.path.includes(pathPrefix);
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

        // Try access current file by cache
        const activeFile = this.app.workspace.getActiveFile()
        if (this.pathToId(activeFile.path) === _id) {
            this.app.vault.cachedRead(activeFile).then(
                data => {
                    this.api.uploadBlock(this.mdAdapter.toBlock(data));
                }
            )
        } else {
            // Read file from fs and upload to remote
            const path = this.idToPath(_id);
            this.app.vault.adapter.read(path).then(
                data => {
                    this.api.uploadBlock(this.mdAdapter.toBlock(data));
                }
            )
        }
    }

    deleteFile(_id: string) {

    }
}