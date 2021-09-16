import {Context} from "../context";
import {Notice, TAbstractFile, TFile} from "obsidian";
import * as path from "path";

export class LocalMdBase {
    ctx: Context
    basePath: string

    recentCreatedFiles = new Set()
    creatingFileState: boolean;

    constructor(ctx: Context) {
        this.ctx = ctx
        this.basePath = 'w'
        this.creatingFileState = false;
    }

    async checkBaseFolder() {
        // If root folder does not exist, creates it.
        const stat = this.ctx.app.vault.adapter.stat(this.basePath)
        if (!stat) {
            await this.ctx.app.vault.createFolder(this.basePath);
            new Notice('Netwik storage created!')
        }
    }

    private idToPath(_id: string) {
        return path.join(this.basePath, _id) + '.md';
    }

    createFile = async () => {
        if (this.recentCreatedFiles.size > 5) {
            this.recentCreatedFiles.clear();
        }
        // debugger
        this.creatingFileState = true;
        const block = await this.ctx.api.createBlock({});
        // @ts-ignore
        const defaultContent = '# New note\n*Id*: ' + block._id;
        // @ts-ignore
        const file = await this.ctx.app.vault.create(this.idToPath(block._id), defaultContent);
        this.recentCreatedFiles.add(file.path)


        this.creatingFileState = false;
    }

    syncCreatedFile(file: TAbstractFile) {
        this.ctx.api.createBlock(
            {title: this.pathToId(file.path)}
        ).then(
            response => {
                // @ts-ignore
                this.app.vault.rename(file, this.idToPath(response._id)).then(
                    () => {
                        new Notice('New file uploaded!')

                    }
                )
            }
        )
    }

    pathToId(path: string) {
        const match = path.match(/(\w+)\.md/)
        if (!match) {
            return undefined;
        }
        return match[1];
    }

    public syncFile(_id: string) {
        // Make remote and local consistency

    }

    private downloadFile(_id: string) {
        this.ctx.api.downloadBlock(_id).then(
            block => {
                const data = this.ctx.mdAdapter.toMarkdown(block);
                this.ctx.app.vault.create(this.idToPath(_id), data).then(
                    () => {
                        new Notice('File synced: ' + _id);
                    }
                )
            }
        )
    }

    public async readCurrent(file: TFile): Promise<string> {
        return await this.ctx.app.vault.cachedRead(file);
    }

    public async write(_id: string, text: string) {
        await this.ctx.app.vault.adapter.write(this.idToPath(_id), text);
    }

    public async deleteFile(path: string) {
        await this.ctx.app.vault.delete(this.ctx.app.vault.getAbstractFileByPath(path))
    }

    isControlledPath(path: string) {
        const pathPrefix = this.basePath + '/';
        return path.includes(pathPrefix)
    }
}
