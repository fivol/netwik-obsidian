import {AnyObject, BlockDict} from "./interface";
import * as yaml from 'js-yaml'


class ModulesRenderer {
    block: BlockDict

    constructor(block: BlockDict) {
        this.block = block
    }

    genMeta(meta: object) {
        if (!meta) {
            return '';
        }
        return `---\n${yaml.dump(meta)}\n---`
    }

    link(value: AnyObject | string, options: AnyObject): string {
        return `[[${value}]]`
    }
}

class ModulesParser {
    text: string
    static regex: { [key: string]: RegExp } = {
        title: /# (.+)/,
        desc: /# *.+\n(.+)*/
    }
    block: AnyObject

    constructor(text: string, block: object) {
        this.text = text
        this.block = block
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

    meta() {
        const match = this.text.match(/---\n([\s\S]*)\n---/)
        if (!match) {
            return {}
        }
        const text = match[1];
        return yaml.load(text);
    }

    body() {
        let text = this.textCopy();
        text = text.replace(/# .+\n/, '')
        return text;
    }
}


export class MarkdownAdapter {
    renderer: ModulesRenderer

    static modules: string[] = [
        'title', 'body', 'create', 'meta'
    ]

    constructor() {
    }

    public toMarkdown(block: BlockDict): string {
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
        debugger
        const block: object = {}
        const parser: ModulesParser = new ModulesParser(text, block);
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
        console.log('block', block)
        return block;
    }
}