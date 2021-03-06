import {Context} from "../context";
import {normalizePath, Notice, TFile} from "obsidian";
import * as path from "path";
import {BlockDict} from "../interface";
import {SuggestionItem} from "../api";


export class LocalMdBase {
    ctx: Context
    basePath: string

    constructor(ctx: Context) {
        this.ctx = ctx
        this.basePath = 'w'
    }

    async checkBaseFolder() {
        // If root folder does not exist, creates it.
        const stat = this.ctx.app.vault.adapter.stat(normalizePath(this.basePath))
        if (!stat) {
            await this.ctx.app.vault.createFolder(this.basePath);
            new Notice('Netwik storage created!')
        }
    }

    public idByName(name: string): string {
        let match = name.match(/(\w+)\W/)
        if (!match) {
            match = name.match(/^(\w+)$/)
            return match && match[1];
        }
        return match[1];
    }

    nameByPath(path: string): string {
        const match = path.match(/\/([^/]+)\.\w+/)
        if (!match) {
            return undefined;
        }
        return match[1];
    }

    nameFromBlock(block: BlockDict | SuggestionItem): string {
        return `${block._id} ${block.title}`;
    }

    idByPath(path: string): string {
        const name = this.nameByPath(path);
        return name && this.idByName(name);
    }

    pathByName(name: string) {
        return `${this.basePath}/${name}.md`;
    }

    public pathById(_id: string): string {
        return this.pathsById(_id)[0]
    }

    public pathsById(_id: string): string[] {
        return this.ctx.app.vault.getMarkdownFiles()
            .filter(file => this.isControlledPath(file.path) && this.idByPath(file.path) === _id)
            .map(file => file.path);
    }

    async getNamesList(): Promise<string[]> {
        const files = await this.ctx.app.vault.adapter.list(normalizePath(this.basePath));
        const mdFiles = files.files.filter(path => path.contains('.md'))
        return mdFiles.map(path => this.nameByPath(path));
    }

    async readCurrent(file: TFile): Promise<string> {
        return await this.ctx.app.vault.cachedRead(file);
    }

    async write(name: string, text: string) {
        await this.ctx.app.vault.adapter.write(normalizePath(this.pathByName(name)), text);
    }

    async read(name: string): Promise<string> {
        return await this.ctx.app.vault.adapter.read(normalizePath(this.pathByName(name)));
    }

    async delete(path: string) {
        await this.ctx.app.vault.delete(this.ctx.app.vault.getAbstractFileByPath(path))
    }

    isControlledPath(path: string) {
        const pathPrefix = this.basePath + '/';
        return path.includes(pathPrefix) && path.includes('.md')
    }
}
