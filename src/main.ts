import {
    App,
    MarkdownPostProcessorContext,
    Notice,
    ObsidianProtocolData,
    Plugin,
    PluginSettingTab,
    Setting
} from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {Context} from './context'
import {API} from "./api";
import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";
import {PluginSettings} from "./interface";

const DEFAULT_SETTINGS: PluginSettings = {
    triggerPhrase: '/',
    backendEntrypoint: 'http://netwik.fivol.space:5050'
}

export default class Netwik extends Plugin {
    private autosuggest: BlockSuggest;
    ctx: Context

    markdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        const links = el.findAll('a.internal-link')
        for (let link of links) {
            const linkText = link.getText();
            if (linkText.contains('|')) {
                continue;
            }
            if (this.ctx.base.mdBase.isControlledPath(`${linkText}.md`)) {
                const match = linkText.match(/\/\w+\W(.+)/)
                if (match) {
                    link.setText(match[1]);
                }
            }
        }
    }

    protocolOpenHandler = (params: ObsidianProtocolData) => {
        if (params.id) {
            const _id = params.id;
            this.ctx.base.downloadFile(_id).then(
                () => {
                    this.ctx.base.openFile(_id)
                }
            )
        }
    }

    async onload() {
        const ctx = new Context()
        this.ctx = ctx
        this.registerMarkdownPostProcessor(this.markdownPostProcessor)
        this.registerObsidianProtocolHandler('netwik', this.protocolOpenHandler)

        await this.loadSettings();
        ctx.plugin = this;
        ctx.app = this.app;
        ctx.api = new API(this.ctx.settings.backendEntrypoint)
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
                    block => this.ctx.base.openFile(block._id)
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
            id: 'copy-url',
            name: 'Copy obsidian url',
            callback: () => {
                const file = this.app.workspace.getActiveFile();
                if (this.ctx.base.mdBase.isControlledPath(file.path)) {
                    const _id = this.ctx.base.mdBase.idByPath(file.path);
                    const url = `obsidian://netwik?id=${_id}`;
                    navigator.clipboard.writeText(url)
                    new Notice('URL copied')
                }
            }
        });

        this.addCommand({
            id: 'upload-note',
            name: 'Upload current note',
            callback: () => {
                if (this.ctx.base.mdBase.isControlledPath(this.ctx.base.getCurrentFile().path)) {
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

        new Setting(containerEl)
            .setName('Backend entrypoint')
            .setDesc('API entrypoint address')
            .addTextArea(text => text
                .setValue(this.plugin.ctx.settings.backendEntrypoint)
                .onChange(async (value) => {
                    this.plugin.ctx.settings.backendEntrypoint = value || DEFAULT_SETTINGS.backendEntrypoint;
                    await this.plugin.saveSettings();
                }));
    }
}
