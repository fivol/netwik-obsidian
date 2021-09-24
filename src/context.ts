import {MarkdownAdapter} from "./syntax/mdAdapter";
import {Base} from "./base/base";
import {API} from "./api";
import {App} from "obsidian";
import MyPlugin from "./main";
import {PluginSettings} from "./interface";


export class Context {
    mdAdapter: MarkdownAdapter;
    base: Base;
    api: API;
    app: App
    plugin: MyPlugin
    settings: PluginSettings
}