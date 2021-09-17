import {Notice, TAbstractFile, TFile} from "obsidian";
import {Context} from "./context";
import {LocalMdBase} from "./base/md";
import {LocalJsonBase} from "./base/json";
import {AnyObject, BlockDict} from "./interface";
import {HTTP_CODE} from "./api";
import {capitalize} from "./utils";

export class Base {
    ctx: Context
    mdBase: LocalMdBase
    jsonBase: LocalJsonBase

    ignoreModifyState: boolean

    pathToId(path: string) {
        const match = path.match(/\/(.+)\.\w+/)
        if (!match) {
            return undefined;
        }
        return match[1];
    }

    private async getIdsList(dir: string) {
        return (await this.ctx.app.vault.adapter.list(dir)).files.map(path => this.pathToId(path)).filter(x => !!x)
    }

    fileModifyHandle = (file: TFile) => {
        if (this.mdBase.isControlledPath(file.path) && file.path === this.ctx.app.workspace.getActiveFile().path
            && !this.ignoreModifyState) {
            this.saveCurrentFile();
        }
    }

    fileCreateHandle = (file: TFile) => {
        if (this.mdBase.isControlledPath(file.path) && !this.ignoreModifyState) {
            this.downloadFile(this.pathToId(file.path))
        }
    }

    fileDeleteHandle = (file: TFile) => {
        if(!this.ignoreModifyState){
            this.jsonBase.delete(this.pathToId(file.path))
        }
    }

    constructor(ctx: Context) {
        this.ctx = ctx
        this.mdBase = new LocalMdBase(ctx)
        this.jsonBase = new LocalJsonBase(ctx)
        this.ignoreModifyState = false;

        this.syncBase()

        this.checkFileStructure()
        ctx.app.vault.on('modify', this.fileModifyHandle);
        ctx.app.vault.on('create', this.fileCreateHandle);
        ctx.app.vault.on('delete', this.fileDeleteHandle);
    }

    onunload() {
        this.ctx.app.vault.off('modify', this.fileModifyHandle)
        this.ctx.app.vault.off('create', this.fileCreateHandle)
        this.ctx.app.vault.off('delete', this.fileDeleteHandle)
    }

    public async syncBase() {
        // Make local base consistent with remote

        let mdIds = await this.getIdsList(this.mdBase.basePath);
        let jsonIds = await this.getIdsList(this.jsonBase.basePath);
        const remoteBlocks = await this.ctx.api.getBlocks(jsonIds);
        const remoteBlocksDict: { [key: string]: BlockDict } = {}
        for (const block of remoteBlocks) {
            remoteBlocksDict[block._id] = block;
        }
        const remoteIds = remoteBlocks.map(block => block._id);
        jsonIds = jsonIds.filter(_id => {
            if (!remoteIds.includes(_id) || !mdIds.includes(_id)) {
                this.jsonBase.delete(_id);
                return false;
            }
            return true;
        })

        mdIds = mdIds.filter(_id => {
            if (!jsonIds.includes(_id)) {
                this.mdBase.delete(this.mdBase.idToPath(_id))
                new Notice(`Note ${_id} deleted`)
                return false;
            }
            return true;
        });
        new Notice('Base is up to date!')
    }

    public getCurrentFileID(): string {
        const activeFile = this.getCurrentFile();
        return this.pathToId(activeFile.path);
    }

    public getCurrentFile(): TFile {
        return this.ctx.app.workspace.getActiveFile();
    }

    public async saveCurrentFile() {
        // Markdown file have changed -> save it to json format and upload to server
        const activeFile = this.ctx.app.workspace.getActiveFile();
        const _id = this.getCurrentFileID();
        const text = await this.mdBase.readCurrent(activeFile);
        const localBlock = await this.jsonBase.read(_id);
        if (!localBlock) {
            // TODO
        }
        const block = this.ctx.mdAdapter.toBlock(text, localBlock);
        // @ts-ignore
        try {
            const response = await this.ctx.api.uploadBlock({...block, _id: _id});
            await this.saveBlockLocally(response);
        } catch (e) {
            if (e.code === HTTP_CODE.GONE) {
                new Notice('This note was deleted in remote')
                await this.deleteCurrentFile()
            }
        }

        // TODO
    }

    public async downloadFile(_id: string) {
        // Update markdown file by data from server, loads if have not locally and update otherwise
        try {
            const block: BlockDict = await this.ctx.api.downloadBlock(_id);
            await this.saveBlockLocally(block);
        } catch (e) {
            if (e.code === HTTP_CODE.GONE) {
                new Notice('This file was deleted from remote')
                await this.mdBase.delete(this.mdBase.idToPath(_id))
            }
        }
    }

    public async createFile(initBlock: { [key: string]: string } | BlockDict): Promise<string> {
        // Creates new file in storage and remote returns it path
        initBlock = {
            ...Base.getDefaultBlock(),
            ...initBlock
        }
        const block: BlockDict = await this.ctx.api.createBlock(initBlock);
        await this.saveBlockLocally(block);
        return block._id
    }

    public async syncFile(file: TAbstractFile) {
        // Decides what should be done with file, may be synced with remote, deleted or renamed
        const stat = this.ctx.app.vault.adapter.stat(file.path);
        const _id = this.pathToId(file.path);
        // TODO
    }

    public async deleteCurrentFile() {
        const path = this.ctx.app.workspace.getActiveFile().path;
        const _id = this.pathToId(path)
        this.ignoreModifyState = true;
        await this.mdBase.delete(path)
        await this.jsonBase.delete(_id)
        this.ignoreModifyState = false
        await this.ctx.api.deleteBlock(_id)
    }

    public async uploadCurrentFile() {
        // File should not be in the base. This method copy file and uploads to remote
        const file = this.getCurrentFile()
        const text = await this.mdBase.readCurrent(file)
        let parsedBlock: AnyObject = this.ctx.mdAdapter.toBlock(text, {})
        parsedBlock.create = {...parsedBlock.create, filename: file.basename}
        if (!parsedBlock.title) {
            parsedBlock.title = capitalize(file.basename)
        }
        const _id = await this.createFile(parsedBlock)
        await this.openFile(_id);
        await this.mdBase.delete(file.path)
    }

    public async openFile(_id: string) {
        await this.ctx.app.workspace.activeLeaf.openFile(this.fileById(_id));
    }

    private static getDefaultBlock() {
        return {
            title: 'Title'
        }
    }

    private async checkFileStructure() {
        await this.mdBase.checkBaseFolder()
        await this.jsonBase.checkBaseFolder()
    }

    private fileById(_id: string) {
        return this.ctx.app.vault.getMarkdownFiles().filter(file => this.pathToId(file.path) === _id)[0]
    }

    private async saveBlockLocally(block: BlockDict) {
        await this.jsonBase.write(block);
        const text = this.ctx.mdAdapter.toMarkdown(block);
        this.ignoreModifyState = true;
        await this.mdBase.write(block._id, text);
        this.ignoreModifyState = false;
    }
}
