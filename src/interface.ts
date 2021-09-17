type ObjectAlias = object;

export interface BlockDict extends ObjectAlias{
    _id: string
}

export interface PluginSettings {
    triggerPhrase: string;
}

export type AnyObject = {[key: string]: any}