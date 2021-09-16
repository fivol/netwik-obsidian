import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";
import {NetwikAPI} from "./api";
import {App} from "obsidian";


export class Context {
    mdAdapter: MarkdownAdapter;
    localBase: Base;
    api: NetwikAPI;
    app: App
}