import {BlockDict} from './interface'

export type SuggestionItem = {
    title: string,
    _id: string
}


export enum HTTP_CODE {
    GONE = 410,
}

class APIError extends Error {
    code: HTTP_CODE

    constructor(code: HTTP_CODE) {
        super(`API Error: ${code}`);
        this.code = code
    }
}

export class API {
    baseURL: string
    constructor(baseURL: string) {
        this.baseURL = baseURL
    }

    private static async getResponseJson(response: Response) {
        if (response.status > 299) {
            throw new APIError(HTTP_CODE.GONE);
        }
        return response.json();
    }


    public getSuggestions = (async (query: string): Promise<SuggestionItem[]> => {
        try {
            const url = `${this.baseURL}/suggestions/?query=${query}`
            const response = await fetch(url);
            const json = await response.json();
            return json.suggestions;
        } catch {
            return []
        }
    })

    public uploadBlock = async (block: object): Promise<BlockDict> => {
        const url = `${this.baseURL}/block/`
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(block)
        });
        return await API.getResponseJson(response);
    }

    public createBlock = async (block: object): Promise<BlockDict> => {
        const url = `${this.baseURL}/block/`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(block)
        });
        return await API.getResponseJson(response);
    }

    public downloadBlock = async (_id: string): Promise<BlockDict> => {
        const url = `${this.baseURL}/block/?_id=${_id}`
        const response = await fetch(url);
        return await API.getResponseJson(response)
    }

    public deleteBlock = async (_id: string) => {
        const url = `${this.baseURL}/block/?_id=${_id}`
        await fetch(
            url,
            {
                method: 'DELETE'
            }
        )
    }

    public getBlocks = async (ids: string[]): Promise<BlockDict[]> => {
        return API.getResponseJson(await fetch(`${this.baseURL}/blocks/?ids=${ids.join(',')}`))
    }
}


