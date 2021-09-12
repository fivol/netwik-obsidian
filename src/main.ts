import { Plugin } from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";
import {NetwikAPI} from "./api";

export default class MyPlugin extends Plugin {
	private autosuggest: BlockSuggest;
	private api: NetwikAPI;

	async onload() {
		console.log('loading plugin v2');
		this.api = new NetwikAPI()
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
				console.log('cm', cm)
			}
		)
	}

	editorChangeHandler = (
		cmEditor: CodeMirror.Editor,
		changeObj: CodeMirror.EditorChange
	): boolean => {
		return this.autosuggest?.update(cmEditor, changeObj);
	};

	setupChangeHandler = () => {
		this.autosuggest = new BlockSuggest(this.app, this.api);

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
