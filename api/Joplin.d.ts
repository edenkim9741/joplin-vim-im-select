import type { ContentScriptType, Script } from './types';

interface JoplinPlugins {
    register(script: Script): Promise<void>;
}

interface SettingSection {
    label: string;
    description?: string;
    iconName?: string;
}

interface SettingItem {
    value: unknown;
    type: number;
    public: boolean;
    section?: string;
    label: string;
    description?: string;
    advanced?: boolean;
}

interface JoplinSettings {
    registerSection(name: string, section: SettingSection): Promise<void>;
    registerSettings(settings: Record<string, SettingItem>): Promise<void>;
    value(key: string): Promise<unknown>;
}

interface JoplinContentScripts {
    register(type: ContentScriptType, id: string, scriptPath: string): Promise<void>;
    onMessage(id: string, callback: (message: unknown) => Promise<unknown> | unknown): Promise<void>;
}

export default class Joplin {
    plugins: JoplinPlugins;
    settings: JoplinSettings;
    contentScripts: JoplinContentScripts;
}
