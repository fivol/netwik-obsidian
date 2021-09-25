import {Notice, TFile} from "obsidian";
import {Context} from "./context";
import {LocalMdBase} from "./base/md";
import {LocalJsonBase} from "./base/json";
import {AnyObject, BlockDict} from "./interface";
import {HTTP_CODE} from "./api";
import {capitalize} from "./utils";
import {BlockMirror} from "./base/blockMirror";

export class Base {
    ctx: Context
    mdBase: LocalMdBase
    jsonBase: LocalJsonBase
    blockMirror: BlockMirror

    fileModifyHandle = (file: TFile) => {
        if (this.blockMirror) {
            return;
        }
        const activeFile = this.ctx.app.workspace.getActiveFile();
        if (file && activeFile && this.mdBase.isControlledPath(file.path) && file.path === activeFile.path
            && !this.ctx.ignoreModifyState) {
            this.saveCurrentFile();
        }
    }

    fileCreateHandle = (file: TFile) => {
        if (file && this.mdBase.isControlledPath(file.path) && !this.ctx.ignoreModifyState) {
            this.indexLocalFile(file.path)
        }
    }

    fileRenameHandle = (file: TFile, oldPath: string) => {
        if (file && this.mdBase.isControlledPath(file.path) && !this.ctx.ignoreModifyState
            && !this.mdBase.isControlledPath(oldPath)) {
            this.indexLocalFile(file.path)
        }
    }

    fileDeleteHandle = (file: TFile) => {
        if (file && this.mdBase.isControlledPath(file.path) && !this.ctx.ignoreModifyState) {
            this.jsonBase.delete(this.mdBase.idByName(file.basename))
        }
    }

    fileOpenHandle = (file: TFile) => {
        if (this.blockMirror) {
            if(!this.blockMirror.isUsedFile(file?.path)){
                this.exitBlockMirrorMode()
            }
            return;
        }
        if (file && this.mdBase.isControlledPath(file.path) && !this.ctx.ignoreModifyState) {
            this.updateMd(this.mdBase.idByName(file.basename))
        }
    }

    constructor(ctx: Context) {
        this.ctx = ctx
        ctx.ignoreModifyState = false;
        this.mdBase = new LocalMdBase(ctx)
        this.jsonBase = new LocalJsonBase(ctx)

        ctx.app.vault.on('modify', this.fileModifyHandle);
        ctx.app.vault.on('create', this.fileCreateHandle);
        ctx.app.vault.on('delete', this.fileDeleteHandle);
        ctx.app.vault.on('rename', this.fileRenameHandle);
        ctx.app.workspace.on('file-open', this.fileOpenHandle)
    }

    async onload() {
        await this.checkFileStructure()
        await this.syncBase()
    }

    async exitBlockMirrorMode() {
        if (this.blockMirror) {
            await this.blockMirror.exit()
            this.blockMirror = null;
        }
    }

    onunload() {
        this.ctx.app.vault.off('modify', this.fileModifyHandle)
        this.ctx.app.vault.off('create', this.fileCreateHandle)
        this.ctx.app.vault.off('rename', this.fileRenameHandle)
        this.ctx.app.vault.off('delete', this.fileDeleteHandle)
        this.blockMirror?.exit()
    }

    async updateMd(_id: string) {
        if (this.mdBase.pathsById(_id).length == 1) {
            const block = await this.jsonBase.read(_id);
            if (!block) {
                return;
            }
            const text = this.ctx.mdAdapter.toMarkdown(block);
            if (!this.ctx.ignoreModifyState) {
                this.ctx.ignoreModifyState = true;
                await this.mdBase.write(this.mdBase.nameByPath(this.mdBase.pathById(_id)), text);
                this.ctx.ignoreModifyState = false;
            }
        }
    }

    public async createBlockMirror(_id: string) {
        this.blockMirror = new BlockMirror(this.ctx)
        await this.blockMirror.enter(_id);
    }

    public async createBlockFromFile(name: string) {
        let block = this.blockByName(name);
        const text = await this.mdBase.read(name);
        block = {
            ...block,
            ...this.ctx.mdAdapter.toBlock(text, {})
        }
        await this.createFile(block, this.mdBase.pathByName(name))
    }

    public async syncBase() {
        // Make local base consistent with remote
        await new BlockMirror(this.ctx).deleteFolder()
        let mdNames = await this.mdBase.getNamesList();
        let mdIds = new Set();
        for (let name of mdNames) {
            const _id = this.mdBase.idByName(name);
            if (!_id) {
                this.createBlockFromFile(name)
            } else {
                if (mdIds.has(_id)) {
                    this.ctx.ignoreModifyState = true
                    await this.mdBase.delete(this.mdBase.pathByName(name))
                    this.ctx.ignoreModifyState = false
                } else {
                    mdIds.add(_id);
                }
            }
        }
        let jsonIds = await this.jsonBase.getIdsList();
        const remoteBlocks = await this.ctx.api.getBlocks(jsonIds);
        const remoteBlocksDict: { [key: string]: BlockDict } = {}
        for (const block of remoteBlocks) {
            remoteBlocksDict[block._id] = block;
        }
        const remoteIds = remoteBlocks.map(block => block._id);
        jsonIds = jsonIds.filter(_id => {
            if (!remoteIds.includes(_id) || !mdIds.has(_id)) {
                this.jsonBase.delete(_id);
                return false;
            }
            return true;
        })

        mdIds.forEach((_id: string) => {
            if (!jsonIds.includes(_id)) {
                this.mdBase.delete(this.mdBase.pathById(_id))
                new Notice(`Note ${_id} deleted`)
                return false;
            }
            return true;
        });
        new Notice('Base is up to date!')
    }

    public getCurrentFileID(): string {
        const activeFile = this.getCurrentFile();
        return this.mdBase.idByPath(activeFile.path);
    }

    public getCurrentFile(): TFile {
        return this.ctx.app.workspace.getActiveFile();
    }

    public async saveCurrentFile() {
        // Markdown file have changed -> save it to json format and upload to server
        if (this.ctx.ignoreModifyState) {
            return;
        }
        const activeFile = this.ctx.app.workspace.getActiveFile();
        const _id = this.getCurrentFileID();
        const text = await this.mdBase.readCurrent(activeFile);
        const localBlock = await this.jsonBase.read(_id) || {};
        const block = this.ctx.mdAdapter.toBlock(text, localBlock);
        // @ts-ignore
        try {
            const remoteBlock = await this.ctx.api.uploadBlock({...block, _id: _id});
            await this.jsonBase.write(remoteBlock);
        } catch (e) {
            if (e.code === HTTP_CODE.GONE) {
                new Notice('This note was deleted in remote')
                await this.deleteCurrentFile()
            }
        }
    }

    public async downloadFile(_id: string) {
        // Update markdown file by data from server, loads if have not locally and update otherwise
        try {
            const block: BlockDict = await this.ctx.api.downloadBlock(_id);
            await this.saveBlockLocally(block);
        } catch (e) {
            if (e.code === HTTP_CODE.GONE) {
                new Notice('This file was deleted from remote')
                await this.mdBase.delete(this.mdBase.pathById(_id))
            }
        }
    }

    public async createFile(initBlock: { [key: string]: string } | BlockDict | object, path?: string): Promise<BlockDict> {
        // Creates new file in storage and remote returns it path
        initBlock = {
            ...Base.getDefaultBlock(),
            ...initBlock
        }
        const block: BlockDict = await this.ctx.api.createBlock(initBlock);
        await this.saveBlockLocally(block, path);
        return block;
    }

    public async deleteCurrentFile() {
        const path = this.ctx.app.workspace.getActiveFile().path;
        const _id = this.mdBase.idByPath(path)
        this.ctx.ignoreModifyState = true;
        await this.mdBase.delete(path)
        await this.jsonBase.delete(_id)
        this.ctx.ignoreModifyState = false
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
        const block = await this.createFile(parsedBlock)
        await this.openFile(block._id);
        await this.mdBase.delete(file.path)
    }

    public async openFile(_id: string) {
        const file = this.ctx.app.vault.getMarkdownFiles().filter(file => this.mdBase.idByPath(file.path) === _id)[0]
        if (file) {
            await this.ctx.app.workspace.activeLeaf.openFile(file)
        }
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

    async checkOrCreateFolder(path: string) {
        // If folder exists do noting, else create
        const stat = await this.ctx.app.vault.adapter.stat(path)
        if (!stat) {
            this.ctx.ignoreModifyState = true;
            await this.ctx.app.vault.createFolder(path);
            this.ctx.ignoreModifyState = false;
        } else if (stat.type !== 'folder') {
            new Notice(`Please, rm file ${path} and reload obsidian. Plugin will create folder at this path`)
        }
    }

    private async saveBlockLocally(block: BlockDict, path?: string) {
        await this.jsonBase.write(block);
        const text = this.ctx.mdAdapter.toMarkdown(block);
        const targetName = this.mdBase.nameFromBlock(block);
        const targetPath = this.mdBase.pathByName(targetName);

        if (path && !await this.ctx.app.vault.adapter.exists(targetPath)) {
            await this.mdBase.rename(path, targetPath);
        }
        await this.mdBase.write(targetName, text);
    }

    private blockByName(name: string): object {
        return {
            title: capitalize(name),
            filename: name
        }
    }

    private async indexLocalFile(path: string) {
        const name = this.mdBase.nameByPath(path);
        let _id = this.mdBase.idByName(name);
        if (_id) {
            const paths: string[] = this.mdBase.pathsById(_id);
            if (paths.length > 1) {
                const block = await this.jsonBase.read(_id);
                this.ctx.ignoreModifyState = true;
                await this.mdBase.delete(paths.filter(filePath => filePath != path)[0]);
                this.ctx.ignoreModifyState = false;
                await this.saveBlockLocally(block, path);
                return;
            }
            const blocks = await this.ctx.api.getBlocks([_id]);
            if (blocks.length === 1) {
                await this.saveBlockLocally(blocks[0], path);
                return;
            }
        }
        await this.createBlockFromFile(name);
    }
}
