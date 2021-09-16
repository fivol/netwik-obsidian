const baseURL = 'http://localhost:8000'

export type SuggestionItem = {
    title: string,
    _id: string
}


export class NetwikAPI {
    constructor() {

    }


    getSuggestions = (async (query: string): Promise<SuggestionItem[]> => {
        try {
            const url = `${baseURL}/suggestions/?query=${query}`
            const response = await fetch(url);
            const json = await response.json();
            return json.suggestions;
        } catch {
            console.error('Failed to fetch suggestions with query ' + query)
            return []
        }
    })

    uploadBlock = async (block: object): Promise<object> => {
        try {
            const url = `${baseURL}/block/`
            return await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(block)
            });
        } catch {
            return {}
        }
    }

    createBlock = async (block: object): Promise<object> => {
        try {
            const url = `${baseURL}/block/`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(block)
            });
            return await response.json()
        } catch {
            return {}
        }
    }

    downloadBlock = async (_id: string): Promise<BlockDict> => {
        try {
            const url = `${baseURL}/block/?_id=${_id}`
            const response = await fetch(url);
            return await response.json();
        } catch {
            return null;
        }
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


