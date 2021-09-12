type ModuleRendererResult = string | object;

type ModuleValue = string | object;

class ModulesRenderer {
    constructor(block: object) {

    }

    title(value: ModuleValue): ModuleRendererResult {
        if (value instanceof String) {
            return `# ${value}`
        }
        return 'UNKNOWN'
    }

    desc(value: ModuleValue): ModuleRendererResult {
        return value;
    }

    body(value: ModuleValue): ModuleRendererResult {
        return {
            text: '*Modules did not render*\n' + value
        }
    }
}

class ModulesParser {
    text: string

    constructor(text: string) {
        this.text = text
    }

    title() {
        return this.text.search(/# (^\n+)/)
    }

    desc() {
        return this.text.search(/^.*\n.(^\n)/)
    }

    body() {
        return this.text;
    }
}


export class MarkdownAdapter {
    renderer: ModulesRenderer

    static modules: string[] = [
        'title', 'desc', 'body'
    ]

    constructor() {
    }


    public toMarkdown(block: object): string {
        let data = ''
        const renderer = new ModulesRenderer(block)
        for (let module in MarkdownAdapter.modules) {
            // @ts-ignore
            if (block[module] !== undefined) {
                // @ts-ignore
                const value = block[module];
                // @ts-ignore
                data += renderer[module](value);
            }
        }
        return data;
    }

    public toBlock(text: string): object {
        const block: object = {}
        const parser: ModulesParser = new ModulesParser(text);

        for (let module in MarkdownAdapter.modules) {
            // @ts-ignore
            if (parser[module] !== undefined) {
                // @ts-ignore
                block[module] = parser[module]()
            }
        }
        console.log(block)
        return block;
    }
}