import {Notice, Plugin} from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {NetwikAPI} from "./api";
import {MarkdownAdapter} from "./mdAdapter";
import {LocalBase} from "./base";

export default class MyPlugin extends Plugin {
    private autosuggest: BlockSuggest;
    private api: NetwikAPI;
    private mdAdapter: MarkdownAdapter;
    private localBase: LocalBase;

    async onload() {
        console.log('loading plugin v2');

        this.api = new NetwikAPI()
        this.mdAdapter = new MarkdownAdapter()
        this.localBase = new LocalBase(this.api, this.app, this.mdAdapter)
        this.addCommands()

        this.setupChangeHandler()
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
                if (!this.localBase.isControlledPath(path)) {
                    new Notice('You can delete only files in "w" folder by this command');
                    return;
                }
                if (leaf.getViewState().type !== 'markdown') {
                    new Notice('Can remove only markdown files')
                    return;
                }
                this.localBase.deleteCurrentFile()
            }
        });

        this.addCommand({
            id: 'create-page',
            name: 'Create remote page',
            callback: () => {
                this.localBase.createFile();
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
        this.autosuggest = new BlockSuggest(this.app, this.api, this.localBase);

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
