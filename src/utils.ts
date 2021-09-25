
export const capitalize = (s: string) => {
    return s[0].toUpperCase() + s.slice(1);
}

export const toBool = (obj: any): boolean => {
    if(typeof obj === 'object'){
        // @ts-ignore
        return Object.keys(obj).length !== 0;
    }
    return !!obj;
}
