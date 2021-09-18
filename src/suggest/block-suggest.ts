import CodeMirrorSuggest from "./codemirror-suggest";
import {SuggestionItem} from "../api";
import {Context} from "../context";
import {BlockDict} from "../interface";

export default class BlockSuggest extends CodeMirrorSuggest<SuggestionItem> {
    ctx: Context

    constructor(ctx: Context) {
        super(ctx.app, ctx.settings.triggerPhrase);
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

    private insertLink(path: string) {
        const head = this.getStartPos();
        const anchor = this.cmEditor.getCursor();

        let insertingValue = `[[${path}]]`;

        this.cmEditor.replaceRange(insertingValue, head, anchor);
        this.close();
    }

    private pathFromBlock(block: BlockDict | SuggestionItem) {
        const name = this.ctx.base.mdBase.nameFromBlock(block);
        return this.ctx.base.mdBase.pathByName(name).match('(.+)\.md')[1];
    }

    selectSuggestion(
        suggestion: SuggestionItem,
        event: KeyboardEvent | MouseEvent
    ): void {
        if (suggestion) {
            this.ctx.base.downloadFile(suggestion._id)
            this.insertLink(this.pathFromBlock(suggestion))
        } else {
            // Press Shift + Enter
            const title = suggestion?.title || this.getInputStr();
            this.ctx.base.createFile({title: title}).then(
                block => {
                    this.insertLink(this.pathFromBlock(block));
                }
            )
        }
    }
}