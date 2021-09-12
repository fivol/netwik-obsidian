import { App } from "obsidian";
import type NaturalLanguageDates from "src/main";
import CodeMirrorSuggest from "./codemirror-suggest";
import {NetwikAPI} from "../api";

interface IBlockCompletion {
    label: string;
}

export default class BlockSuggest extends CodeMirrorSuggest<IBlockCompletion> {
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

    getSuggestions(inputStr: string): IBlockCompletion[] {
        this.api.getSuggestions(inputStr)
        return [
            { label: inputStr },
            { label: 'Hello world1' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
            { label: 'Hello world2' },
        ];
    }

    renderSuggestion(suggestion: IBlockCompletion, el: HTMLElement): void {
        el.setText(suggestion.label);
    }

    selectSuggestion(
        suggestion: IBlockCompletion,
        event: KeyboardEvent | MouseEvent
    ): void {
        const head = this.getStartPos();
        const anchor = this.cmEditor.getCursor();

        let insertingValue = `[[${suggestion.label}]]`;

        this.cmEditor.replaceRange(insertingValue, head, anchor);
        this.close();
    }
}