type ObjectAlias = object;

export interface BlockDict extends ObjectAlias{
    _id: string
    [x: string]: any
}

export interface PluginSettings {
    triggerPhrase: string;
    backendEntrypoint: string
}

export type AnyObject = {[key: string]: any}