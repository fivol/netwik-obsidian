import {BlockDict} from './interface'

const baseURL = 'http://localhost:8000'

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
        super();
        this.code = code
    }
}


export class API {
    constructor() {

    }

    private async getResponseJson(response: Response) {
        if (response.status > 299) {
            throw new APIError(HTTP_CODE.GONE);
        }
        return response.json();
    }


    getSuggestions = (async (query: string): Promise<SuggestionItem[]> => {
        try {
            const url = `${baseURL}/suggestions/?query=${query}`
            const response = await fetch(url);
            const json = await response.json();
            return json.suggestions;
        } catch {
            return []
        }
    })

    uploadBlock = async (block: object): Promise<BlockDict> => {
        const url = `${baseURL}/block/`
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(block)
        });
        return await this.getResponseJson(response);
    }

    createBlock = async (block: object): Promise<BlockDict> => {
        const url = `${baseURL}/block/`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(block)
        });
        return await this.getResponseJson(response);
    }

    downloadBlock = async (_id: string): Promise<BlockDict> => {
        const url = `${baseURL}/block/?_id=${_id}`
        const response = await fetch(url);
        return await this.getResponseJson(response)
    }

    deleteBlock = async (_id: string) => {
        const url = `${baseURL}/block/?_id=${_id}`
        await fetch(
            url,
            {
                method: 'DELETE'
            }
        )
    }
}


