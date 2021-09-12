import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";
import {NetwikAPI, SuggestionItem} from "../api";

export default class BlockSuggest extends CodeMirrorSuggest<SuggestionItem> {
    api: NetwikAPI
    constructor(app: App, api: NetwikAPI) {
        super(app, '@');
        this.api = api

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
        return [
            {
                'title': 'ABC',
                '_id': 'sdf'
            }
        ]
        // return await this.api.getSuggestions(inputStr)
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

        // let insertingValue = `[[${suggestion._id}|${suggestion.title}]]`;
        let insertingValue = 'asdf'

        this.cmEditor.replaceRange(insertingValue, head, anchor);
        this.close();
    }
}