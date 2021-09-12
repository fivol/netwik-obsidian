import { Plugin } from 'obsidian';
import BlockSuggest from "./suggest/block-suggest";
import * as CodeMirror from "codemirror";

export default class MyPlugin extends Plugin {
	private autosuggest: BlockSuggest;

	async onload() {
		console.log('loading plugin v2');

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
		this.autosuggest = new BlockSuggest(this.app, this);

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
