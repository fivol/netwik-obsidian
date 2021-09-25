import {Context} from "../context";
import {Notice, TFile} from "obsidian";
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
        await this.ctx.base.checkOrCreateFolder(this.basePath);
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
        return !!match && match[1];
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
        const paths = this.pathsById(_id);
        return paths && paths[0]
    }

    public pathsById(_id: string): string[] {
        return this.ctx.app.vault.getMarkdownFiles()
            .filter(file => this.isControlledPath(file.path) && this.idByPath(file.path) === _id)
            .map(file => file.path);
    }

    async getNamesList(): Promise<string[]> {
        const files = await this.ctx.app.vault.adapter.list(this.basePath);
        const mdFiles = files.files.filter(path => path.contains('.md'))
        return mdFiles.map(path => this.nameByPath(path));
    }

    async readCurrent(file: TFile): Promise<string> {
        return await this.ctx.app.vault.cachedRead(file);
    }

    async write(name: string, text: string) {
        await this.writePath(this.pathByName(name), text);
    }

    async writePath(path: string, text: string) {
        this.ctx.ignoreModifyState = true;
        await this.ctx.app.vault.adapter.write(path, text);
        this.ctx.ignoreModifyState = false;
    }

    async createFile(path: string, text: string) {
        this.ctx.ignoreModifyState = true;
        const file = await this.ctx.app.vault.create(path, text);
        this.ctx.ignoreModifyState = false;
        return file;
    }

    async rename(path: string, targetPath: string) {
        this.ctx.ignoreModifyState = true;
        await this.ctx.app.vault.rename(this.ctx.app.vault.getAbstractFileByPath(path), targetPath);
        this.ctx.ignoreModifyState = false;
    }

    async read(name: string): Promise<string> {
        return await this.ctx.app.vault.adapter.read(this.pathByName(name));
    }

    async delete(path: string) {
        this.ctx.ignoreModifyState = true;
        await this.ctx.app.vault.delete(this.ctx.app.vault.getAbstractFileByPath(path))
        this.ctx.ignoreModifyState = false;
    }

    isControlledPath(path: string) {
        return !!path.match(new RegExp(`${this.basePath}/[^/]+\.md`))
    }
}
