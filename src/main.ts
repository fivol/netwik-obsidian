import { Plugin } from 'obsidian';
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

		this.setupChangeHandler()
	}

	onunload() {
		console.log('unloading plugin');
		this.removeChangeHandler()
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
