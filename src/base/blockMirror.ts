import {Context} from "../context";
import {Notice, TFile} from "obsidian";
import * as CodeMirror from "codemirror";
import {BlockDict} from "../interface";
import Timeout = NodeJS.Timeout;


export class BlockMirror {
    ctx: Context
    basePath: string
    _id: string
    mdFile: TFile
    block: BlockDict
    mdBlocked: boolean
    mirrorBlocked: boolean
    unlockTimeoutId: Timeout

    constructor(ctx: Context) {
        this.ctx = ctx
        this.basePath = `${ctx.base.mdBase.basePath}/tmp`
        this.mdBlocked = false
        this.mirrorBlocked = false
    }

    public isUsedFile(path: string) {
        return path === this.mdFile.path || path === this.getMirrorPath()
    }

    codeChangeHandler = (
        cmEditor: CodeMirror.Editor,
        changeObj: CodeMirror.EditorChange
    ) => {
        if (this.ctx.ignoreModifyState) {
            return
        }
        const text = cmEditor.getDoc().getValue();
        if (this.isMirrorValue(text)) {
            if (this.mirrorBlocked) {
                return
            }
            this.mdBlocked = true;
            this.updateMarkdown(text);
        } else {
            if (this.mdBlocked) {
                return
            }
            this.mirrorBlocked = true;
            this.updateMirror(text)
        }
        this.delayUnBlock();
    }

    private delayUnBlock() {
        if (this.unlockTimeoutId) {
            clearTimeout(this.unlockTimeoutId)
        }
        this.unlockTimeoutId = setTimeout(() => {
            this.mirrorBlocked = false;
            this.mdBlocked = false;
        }, 1000)
    }

    private isMirrorValue(text: string): boolean {
        return text.contains('(mirror)')
    }

    private getMirrorPath(): string {
        return `${this.basePath}/${this._id}.md`
    }

    async updateMirror(markdown: string) {
        const block = this.ctx.mdAdapter.toBlock(markdown, this.block);
        await this.ctx.base.jsonBase.write(block);
        const mirrorText = this.ctx.mdAdapter.toBlockMirror(block);
        await this.ctx.base.mdBase.writePath(this.getMirrorPath(), mirrorText);
    }

    async updateMarkdown(mirror: string) {
        const block = {...this.block, ...this.ctx.mdAdapter.fromCodeMirror(mirror)};
        if (!block) {
            console.log('Code mirror not valid')
            return
        }
        this.block = block
        await this.ctx.base.jsonBase.write(block);
        const markdown = this.ctx.mdAdapter.toMarkdown(block);
        await this.ctx.base.mdBase.writePath(this.mdFile.path, markdown);
    }

    layoutChangeHandle = () => {
        if (!this.ctx.ignoreModifyState) {
            this.exit()
        }
    }

    public async enter(_id: string) {
        this._id = _id;
        await this.ctx.base.checkOrCreateFolder(this.basePath);
        this.block = await this.ctx.base.jsonBase.read(_id);
        const file = await this.ctx.base.mdBase.createFile(this.getMirrorPath(),
            this.ctx.mdAdapter.toBlockMirror(this.block));
        this.mdFile = this.ctx.app.workspace.getActiveFile()
        const mirrorLeaf = await this.ctx.app.workspace.splitActiveLeaf('vertical');
        await mirrorLeaf.openFile(file);

        this.ctx.plugin.registerCodeMirror(
            cm => {
                cm.on('change', this.codeChangeHandler);
            }
        )
        new Notice('Code mirror mode')

        this.ctx.app.workspace.on('layout-change', this.layoutChangeHandle)
    }

    public async deleteFolder() {
        if (await this.ctx.app.vault.adapter.stat(this.basePath)) {
            this.ctx.ignoreModifyState = true;
            await this.ctx.app.vault.delete(this.ctx.app.vault.getAbstractFileByPath(this.basePath), true)
            this.ctx.ignoreModifyState = false;
        }
    }

    async exit() {
        await this.deleteFolder();
        this.ctx.plugin.registerCodeMirror(
            cm => {
                cm.off('change', this.codeChangeHandler)
            }
        )
        new Notice('Exit code mirror')
        this.ctx.app.workspace.off('layout-change', this.layoutChangeHandle)
    }
}