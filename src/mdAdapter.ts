import {BlockDict} from "./interface";

type ModuleRendererResult = string | object;

type ModuleValue = string | object;

interface BlockRenderLayout {
    items: string[]
}

class ModulesRenderer {
    constructor(block: object) {

    }

}

class ModulesParser {
    text: string
    static regex: {[key: string]: RegExp} = {
        title: /^# (.+)/,
        desc: /^# .+\n(.+)/
    }

    constructor(text: string) {
        this.text = text

    }

    private textCopy() {
        return `${this.text}`
    }

    private extractMatch = (pattern: RegExp) => {
        const match = this.text.match(pattern)
        if (!match) {
            return undefined;
        }
        return match[1];
    }

    title() {
        return this.extractMatch(ModulesParser.regex.title)
    }

    desc() {
        return this.extractMatch(ModulesParser.regex.desc)
    }

    body() {
        let text = this.textCopy();
        text = text.replace(/^# .+\n.+/, '')
        text = text.replace(/^# .+\n/, '')
        return text;
    }
}


export class MarkdownAdapter {
    renderer: ModulesRenderer

    static modules: string[] = [
        'title', 'desc', 'body'
    ]

    constructor() {
    }

    public toMarkdown(block: { [key: string]: any }): string {
        let text = ''
        const renderer = new ModulesRenderer(block)
        if (block.title) {
            text += `# ${block.title}\n`;
        }
        if (block.desc) {
            text += block.desc + '\n';
        }
        if (block.body) {
            text += block.body;
        }
        return text
    }

    public toBlock(text: string, localBlock: BlockDict): object {
        const block: object = {}
        const parser: ModulesParser = new ModulesParser(text);
        for (const module of MarkdownAdapter.modules) {
            // @ts-ignore
            if (parser[module] !== undefined) {
                // @ts-ignore
                const moduleValue = parser[module]()
                if (moduleValue) {
                    // @ts-ignore
                    block[module] = moduleValue;
                }
            }
        }
        console.log('Parsed block', block)
        return block;
    }
}