const baseURL = 'http://localhost:8000'

export type SuggestionItem = {
    title: string,
    _id: string
}


export class NetwikAPI {
    constructor() {

    }

    getSuggestions = async (query: string): Promise<SuggestionItem[]> => {
        try {
            const url = `${baseURL}/suggestions/?query=${query}`
            const response = await fetch(url);
            const json = await response.json();
            console.log('Success fetch suggestions')
            return json.suggestions;
        } catch {
            console.error('Failed to fetch suggestions with query ' + query)
            return []
        }
    }
}


