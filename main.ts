import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {

	async onload() {
		console.log('loading plugin');
	}

	onunload() {
		console.log('unloading plugin');
	}
}
