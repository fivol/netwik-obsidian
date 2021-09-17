import {Context} from "../context";
import {Notice, TAbstractFile, TFile} from "obsidian";
import * as path from "path";

export class LocalMdBase {
    ctx: Context
    basePath: string

    constructor(ctx: Context) {
        this.ctx = ctx
        this.basePath = 'w'
    }

    async checkBaseFolder() {
        // If root folder does not exist, creates it.
        const stat = this.ctx.app.vault.adapter.stat(this.basePath)
        if (!stat) {
            await this.ctx.app.vault.createFolder(this.basePath);
            new Notice('Netwik storage created!')
        }
    }

    idToPath(_id: string) {
        return path.join(this.basePath, _id) + '.md';
    }

    async readCurrent(file: TFile): Promise<string> {
        return await this.ctx.app.vault.cachedRead(file);
    }

    async write(_id: string, text: string) {
        await this.ctx.app.vault.adapter.write(this.idToPath(_id), text);
    }

    async delete(path: string) {
        await this.ctx.app.vault.delete(this.ctx.app.vault.getAbstractFileByPath(path))
    }

    isControlledPath(path: string) {
        const pathPrefix = this.basePath + '/';
        return path.includes(pathPrefix)
    }
}
