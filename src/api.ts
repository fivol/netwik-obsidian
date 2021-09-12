const axios = require('axios');

const baseURL = 'http://localhost:8000'

export class NetwikAPI {
    instance: any

    constructor() {
        this.instance = axios.create({
            baseURL: baseURL,
            timeout: 1000,
        });
    }
    getSuggestions = async (query: string) => {
        const response = await axios.get('/suggestions',  {params: {query: query}})
        return response.data.suggestions
    }
}


