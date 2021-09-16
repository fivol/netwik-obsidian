import CodeMirrorSuggest from "./codemirror-suggest";
import {SuggestionItem} from "../api";
import {Context} from "../context";

export default class BlockSuggest extends CodeMirrorSuggest<SuggestionItem> {
    ctx: Context

    constructor(ctx: Context) {
        super(ctx.app, '@');
        this.ctx = ctx

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
                        text: "and Enter to create note",
                    });
                });
            });
        });
    }

    async getSuggestions(inputStr: string): Promise<SuggestionItem[]> {
        const suggestions = await this.ctx.api.getSuggestions(inputStr)
        return [
            // {
            //     title: inputStr,
            //     _id: '_create'
            // },
            ...suggestions
        ]
    }

    renderSuggestion(suggestion: SuggestionItem, el: HTMLElement): void {
        el.setText(suggestion.title);
    }

    selectSuggestion(
        suggestion: SuggestionItem,
        event: KeyboardEvent | MouseEvent
    ): void {
        if (!suggestion) {
            // Press Shift + Enter
            this.ctx.base.createFile(this.getInputStr());
            return;
        }
        const head = this.getStartPos();
        const anchor = this.cmEditor.getCursor();

        let insertingValue = `[[${suggestion._id}|${suggestion.title}]]`;

        this.cmEditor.replaceRange(insertingValue, head, anchor);
        this.close();

        this.ctx.base.downloadFile(suggestion._id).then(
            () => this.ctx.base.openFile(suggestion._id)
        )
    }
}