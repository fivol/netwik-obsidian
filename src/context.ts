import {MarkdownAdapter} from "./mdAdapter";
import {Base} from "./base";
import {API} from "./api";
import {App} from "obsidian";


export class Context {
    mdAdapter: MarkdownAdapter;
    localBase: Base;
    api: API;
    app: App
}