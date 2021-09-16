import {Notice, Plugin} from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {NetwikAPI} from "./api";
import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";
import {Context} from './context'

export default class MyPlugin extends Plugin {
    private autosuggest: BlockSuggest;
    private ctx: Context

    async onload() {
        new Notice('Use netwik')
        // this.ctx = new Context()
        // this.ctx.api = new NetwikAPI()
        // this.ctx.mdAdapter = new MarkdownAdapter()
        // this.ctx.localBase = new Base(this.ctx)
        this.addCommands()
        await this.dev();
    }

    async dev() {
        // this.setupChangeHandler()
        // await this.app.vault.createFolder('abc')
        // await this.app.vault.create('file____1.md', 'empty');
        await this.app.vault.adapter.write('hi1.md', 'hello world')
    }

    onunload() {
        console.log('unloading plugin');
        this.removeChangeHandler()
    }

    addCommands() {

        this.addCommand({
            id: 'delete-block',
            name: 'Delete remote page',
            callback: () => {
                let leaf = this.app.workspace.activeLeaf;
                console.log('View state', leaf.getViewState())
                const path = leaf.getViewState().state.file;
                if (!this.ctx.localBase.mdBase.isControlledPath(path)) {
                    new Notice(`You can delete only files in "${this.ctx.localBase.mdBase.basePath}" folder by this command`);
                    return;
                }
                if (leaf.getViewState().type !== 'markdown') {
                    new Notice('Can remove only markdown files')
                    return;
                }
                this.ctx.localBase.deleteCurrentFile()
            }
        });

        this.addCommand({
            id: 'create-page',
            name: 'Create remote page',
            callback: () => {
                this.ctx.localBase.createFile();
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

    removeChangeHandler = () => {
        this.registerCodeMirror((cm: CodeMirror.Editor) => {
            cm.off("change", this.editorChangeHandler);
        });
    }

}
