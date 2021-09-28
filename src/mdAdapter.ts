import {AnyObject, BlockDict} from "./interface";
import * as yaml from 'js-yaml'
import {toBool} from "./utils";


class ModulesRenderer {
    block: BlockDict

    constructor(block: BlockDict) {
        this.block = block
    }

    meta(meta: object) {
        if (!meta) {
            return '';
        }
        return `---\n${yaml.dump(meta)}\n---\n`
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
        text = text.replace(/---\n[\s\S]+\n---/, '')
        return text;
    }
}


export class MarkdownAdapter {
    renderer: ModulesRenderer

    static renderableModules: string[] = [
        'title', 'body', 'meta'
    ]

    constructor() {
    }

    private renderLayout(layout: string, block: BlockDict): string {
        layout = layout.replace(/\[(.*)]{(.*)}/g, (match, key, value) => {
            console.log(key, value)
            return '!!'
        });
        return layout;
    }

    public toMarkdown(block: BlockDict): string {
        let text = ''
        const renderer = new ModulesRenderer(block)
        if (block.meta) {
            text += renderer.meta(block.meta)
        }
        if (block.title) {
            text += `# ${block.title}\n`;
        }
        if (block.desc) {
            text += block.desc + '\n';
        }
        if (block.body) {
            text += this.renderLayout(block.body, block);
        }

        return text
    }

    public toBlock(text: string, localBlock: BlockDict | object): BlockDict {
        const block: object = localBlock
        const parser: ModulesParser = new ModulesParser(text, block);
        for (const module of MarkdownAdapter.renderableModules) {
            // @ts-ignore
            if (parser[module] !== undefined) {
                // @ts-ignore
                const moduleValue = parser[module]()
                if (toBool(moduleValue)) {
                    // @ts-ignore
                    block[module] = moduleValue;
                } else {
                    // @ts-ignore
                    delete block[module];
                }
            }
        }
        // @ts-ignore
        return block;
    }

    public toBlockMirror(block: BlockDict): string {
        let text = ""
        text += `# ${block.title} (mirror)\n`
        text += `**id:** ${block._id}\n\n`

        text += `\`\`\`yaml\n${yaml.dump(block)}\n\`\`\`\n`
        return text;
    }

    public fromCodeMirror(text: string): BlockDict {
        const match = text.match(/```yaml\n([\s\S]+)\n```/)
        if (!match) {
            return null;
        }
        const yamlText = match[1];
        let block;
        try {
            block = yaml.load(yamlText);
        } catch (e) {
            return null;
        }
        // @ts-ignore
        if (!block || !block._id) {
            return null;
        }
        // @ts-ignore
        return block;
    }
}