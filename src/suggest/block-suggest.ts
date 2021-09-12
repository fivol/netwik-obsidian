import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";
import {NetwikAPI, SuggestionItem} from "../api";
import {LocalBase} from "../base";

export default class BlockSuggest extends CodeMirrorSuggest<SuggestionItem> {
    api: NetwikAPI
    localBase: LocalBase

    constructor(app: App, api: NetwikAPI, localBase: LocalBase) {
        super(app, '@');
        this.api = api
        this.localBase = localBase

        this.updateInstructions();
    }

    open(): void {
        super.open();
        // update the instructions since they are settings-dependent
        this.updateInstructions();
    }

    protected updateInstructions(): void {
        this.setInstructions((containerEl) => {
            containerEl.createDiv("prompt-instructions", (instructions) => {
                instructions.createDiv({cls: "prompt-instruction"}, (instruction) => {
                    instruction.createSpan({
                        cls: "prompt-instruction-command",
                        text: "Shift",
                    });
                    instruction.createSpan({
                        text: "Keep text as alias",
                    });
                });
            });
        });
    }

    async getSuggestions(inputStr: string): Promise<SuggestionItem[]> {
        return await this.api.getSuggestions(inputStr)
    }

    renderSuggestion(suggestion: SuggestionItem, el: HTMLElement): void {
        el.setText(suggestion.title);
    }

    selectSuggestion(
        suggestion: SuggestionItem,
        event: KeyboardEvent | MouseEvent
    ): void {
        const head = this.getStartPos();
        const anchor = this.cmEditor.getCursor();

        let insertingValue = `[[${suggestion._id}|${suggestion.title}]]`;

        this.cmEditor.replaceRange(insertingValue, head, anchor);
        this.close();

        this.localBase.syncFile(suggestion._id)
    }
}