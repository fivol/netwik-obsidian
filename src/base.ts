import {TAbstractFile, TFile} from "obsidian";
import {Context} from "./context";
import {LocalMdBase} from "./base/md";
import {LocalJsonBase} from "./base/json";
import {BlockDict} from "./interface";

export class Base {
    ctx: Context
    mdBase: LocalMdBase
    jsonBase: LocalJsonBase

    fileModifyHandle = (file: TFile) => {
        // if (this.mdBase.isControlledPath(file.path) && file.path === this.ctx.app.workspace.getActiveFile().path) {
        //     this.saveCurrentFile();
        // }
        console.log('Filed modified: ', file)
    }

    fileCreateHandle = (file: TFile) => {
        // if (this.mdBase.isControlledPath(file.path)) {
        //     this.syncFile(file);
        // }
    }

    constructor(ctx: Context) {
        this.ctx = ctx
        this.mdBase = new LocalMdBase(ctx)
        this.jsonBase = new LocalJsonBase(ctx)

        this.checkFileStructure()
        ctx.app.vault.on('modify', this.fileModifyHandle);
        ctx.app.vault.on('create', this.fileCreateHandle);
    }

    onunload() {
        this.ctx.app.vault.off('modify', this.fileModifyHandle)
        this.ctx.app.vault.off('create', this.fileCreateHandle)
    }

    public async saveCurrentFile() {
        // Markdown file have changed -> save it to json format and upload to server
        const activeFile = this.ctx.app.workspace.getActiveFile();
        const _id = this.mdBase.pathToId(activeFile.path);
        const text = await this.mdBase.readCurrent(activeFile);
        const localBlock = await this.jsonBase.read(_id);
        if (!localBlock) {
            // TODO
        }
        const block = this.ctx.mdAdapter.toBlock(text, localBlock);
        const response = this.ctx.api.uploadBlock(block);
        // TODO
    }

    public async downloadFile(_id: string) {
        // Update markdown file by data from server, loads if have not locally and update otherwise
        const block: BlockDict = await this.ctx.api.downloadBlock(_id);
        await this.saveBlockLocally(block);
    }

    public async createFile(): Promise<string> {
        // Creates new file in storage and remote returns it path
        const block: BlockDict = await this.ctx.api.createBlock({});
        await this.saveBlockLocally(block);
        return this.mdBase.idToPath(block._id);
    }

    public async syncFile(file: TAbstractFile) {
        // Decides what should be done with file, may be synced with remote, deleted or renamed
        const stat = this.ctx.app.vault.adapter.stat(file.path);
        const _id = this.mdBase.pathToId(file.path);
        // TODO
    }

    public async deleteCurrentFile() {
        const path = this.ctx.app.workspace.getActiveFile().path;
        const _id = this.mdBase.pathToId(path)
        await this.mdBase.deleteFile(path)
        await this.ctx.api.deleteBlock(_id)
    }

    public async openFile(file: TFile) {
        await this.ctx.app.workspace.activeLeaf.openFile(file);
    }

    private async checkFileStructure() {
        await this.mdBase.checkBaseFolder()
        await this.jsonBase.checkBaseFolder()
    }

    private async saveBlockLocally(block: BlockDict) {
        await this.jsonBase.write(block);
        const text = this.ctx.mdAdapter.toMarkdown(block);
        await this.mdBase.write(block._id, text);
    }
}
