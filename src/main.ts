import {Notice, Plugin} from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {Context} from './context'
import {API} from "./api";
import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";

export default class MyPlugin extends Plugin {
    private autosuggest: BlockSuggest;
    private ctx: Context

    async onload() {
        new Notice('Use netwik')
        const ctx = new Context()
        this.ctx = ctx
        ctx.plugin = this;
        ctx.app = this.app;
        ctx.api = new API()
        ctx.mdAdapter = new MarkdownAdapter()
        ctx.base = new Base(this.ctx)
        this.addCommands()
        this.setupChangeHandler()
        // await this.dev();
    }

    async dev() {
        // this.setupChangeHandler()
        // await this.app.vault.createFolder('abc')
        // await this.app.vault.create('file____1.md', 'empty');
        await this.app.vault.adapter.write('hi2.md', 'hello world')
    }

    onunload() {
        console.log('unloading plugin');
        this.registerCodeMirror((cm: CodeMirror.Editor) => {
            cm.off("change", this.editorChangeHandler);
        });
        this.ctx.base.onunload();
    }

    addCommands() {

        this.addCommand({
            id: 'delete-note',
            name: 'Delete remote note',
            callback: () => {
                let leaf = this.app.workspace.activeLeaf;
                console.log('View state', leaf.getViewState())
                const path = leaf.getViewState().state.file;
                if (!this.ctx.base.mdBase.isControlledPath(path)) {
                    new Notice(`You can delete only files in "${this.ctx.base.mdBase.basePath}" folder by this command`);
                    return;
                }
                if (leaf.getViewState().type !== 'markdown') {
                    new Notice('Can remove only markdown files')
                    return;
                }
                this.ctx.base.deleteCurrentFile()
            }
        });

        this.addCommand({
            id: 'create-note',
            name: 'Create note',
            callback: () => {
                this.ctx.base.createFile();
            }
        });

        this.addCommand({
            id: 'update-note',
            name: 'Update note',
            callback: () => {
                this.ctx.base.createFile();
            }
        });
    }

    // Only for dev
    removeAllChangeHandlers = () => {
        this.app.workspace.iterateCodeMirrors(
            cm => {
                // @ts-ignore
                cm._handlers.change.map(
                    (handler: any) => {
                        cm.off('change', handler)
                        console.log(handler, handler)
                    }
                )
            }
        )
    }

    editorChangeHandler = async (
        cmEditor: CodeMirror.Editor,
        changeObj: CodeMirror.EditorChange
    ) => {
        return this.autosuggest?.update(cmEditor, changeObj);
    };

    setupChangeHandler = () => {
        this.autosuggest = new BlockSuggest(this.ctx);

        this.registerCodeMirror(cm => {
            cm.on('change', this.editorChangeHandler)
        })
    }

}
