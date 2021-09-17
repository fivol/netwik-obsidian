import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {Context} from './context'
import {API} from "./api";
import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";
import {PluginSettings} from "./interface";

const DEFAULT_SETTINGS: PluginSettings = {
    triggerPhrase: '@'
}

export default class Netwik extends Plugin {
    private autosuggest: BlockSuggest;
    ctx: Context

    async onload() {
        const ctx = new Context()
        this.ctx = ctx

        await this.loadSettings();
        ctx.plugin = this;
        ctx.app = this.app;
        ctx.api = new API()
        ctx.mdAdapter = new MarkdownAdapter()
        ctx.base = new Base(this.ctx)
        this.addCommands()
        this.setupChangeHandler()
        this.addSettingTab(new SettingTab(this.app, this));
    }

    async loadSettings() {
        this.ctx.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.restart();
        await this.saveData(this.ctx.settings);
    }

    async onunload() {
        this.registerCodeMirror((cm: CodeMirror.Editor) => {
            cm.off("change", this.editorChangeHandler);
        });
        this.ctx.base.onunload();
    }

    async restart() {
        await this.onunload()
        await this.onload()
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
                this.ctx.base.createFile({}).then(
                    _id => this.ctx.base.openFile(_id)
                );
            }
        });

        this.addCommand({
            id: 'update-note',
            name: 'Update note',
            callback: () => {
                this.ctx.base.downloadFile(this.ctx.base.getCurrentFileID());
            }
        });

        this.addCommand({
            id: 'sync-base',
            name: 'Sync base',
            callback: () => {
                this.ctx.base.syncBase();
            }
        });

        this.addCommand({
            id: 'upload-note',
            name: 'Upload current note',
            callback: () => {
                if(this.ctx.base.mdBase.isControlledPath(this.ctx.base.getCurrentFile().path)) {
                    new Notice('Upload command should be used for notes in your local storage, this file already uploaded')
                    return;
                }
                this.ctx.base.uploadCurrentFile();
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


class SettingTab extends PluginSettingTab {
    plugin: Netwik;

    constructor(app: App, plugin: Netwik) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Trigger symbol')
            .setDesc('Show suggestions after typing this')
            .addText(text => text
                .setValue(this.plugin.ctx.settings.triggerPhrase)
                .setPlaceholder('"@" by default')
                .onChange(async (value) => {
                    this.plugin.ctx.settings.triggerPhrase = value || DEFAULT_SETTINGS.triggerPhrase;
                    await this.plugin.saveSettings();
                }));
    }
}
