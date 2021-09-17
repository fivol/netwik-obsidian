import {AnyObject, BlockDict} from "./interface";

type ModuleRendererResult = string | object;

type ModuleValue = string | object;

interface BlockRenderLayout {
    items: string[]
}

class ModulesRenderer {
    constructor(block: object) {

    }

    genMeta(aliases: string[]) {
        if (!aliases.length) {
            return '';
        }
        return `---\naliases: [${aliases.join(', ')}]\n---\n`
    }

}

class ModulesParser {
    text: string
    static regex: { [key: string]: RegExp } = {
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
        text = text.replace(/^# .+\n?(.+)?\n?/, '')
        return text;
    }
}


export class MarkdownAdapter {
    renderer: ModulesRenderer

    static modules: string[] = [
        'title', 'desc', 'body', 'create'
    ]

    constructor() {
    }

    public toMarkdown(block: { [key: string]: any }): string {
        let text = ''
        const renderer = new ModulesRenderer(block)
        if (block.create?.filename) {
            text += renderer.genMeta([block.create.filename].filter(alias => block.title !== alias))
        }
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

    public toBlock(text: string, localBlock: BlockDict | object): object {
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
        return block;
    }
}