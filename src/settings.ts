import joplin from 'api';
import { SettingItemType } from 'api/types';

export const SETTINGS_SECTION = 'vimImSelect';

export const SettingKeys = {
    macismPath: 'vimImSelect.macismPath',
    normalModeInputMethod: 'vimImSelect.normalModeInputMethod',
    restoreInsertInputMethod: 'vimImSelect.restoreInsertInputMethod',
    debugLogging: 'vimImSelect.debugLogging',
} as const;

export interface PluginSettings {
    macismPath: string;
    normalModeInputMethod: string;
    restoreInsertInputMethod: boolean;
    debugLogging: boolean;
}

export async function registerSettings(): Promise<void> {
    await joplin.settings.registerSection(SETTINGS_SECTION, {
        label: 'Vim IM Select',
        description: 'Automatically switch the macOS input method when Vim mode changes.',
        iconName: 'fas fa-keyboard',
    });

    await joplin.settings.registerSettings({
        [SettingKeys.macismPath]: {
            value: '/opt/homebrew/bin/macism',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'macism executable path',
            description: 'Apple Silicon Homebrew default: /opt/homebrew/bin/macism. Intel Homebrew is usually /usr/local/bin/macism.',
        },
        [SettingKeys.normalModeInputMethod]: {
            value: 'com.apple.keylayout.ABC',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Normal mode input method',
            description: 'Input method identifier used in Vim Normal and Visual modes.',
        },
        [SettingKeys.restoreInsertInputMethod]: {
            value: true,
            type: SettingItemType.Bool,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Restore Insert mode input method',
            description: 'Restore the input method that was active immediately before leaving Insert/Replace mode.',
        },
        [SettingKeys.debugLogging]: {
            value: false,
            type: SettingItemType.Bool,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Debug logging',
            description: 'Write Vim mode and IM switching details to the Joplin developer console.',
            advanced: true,
        },
    });
}

export async function loadSettings(): Promise<PluginSettings> {
    return {
        macismPath: String(await joplin.settings.value(SettingKeys.macismPath) ?? '').trim(),
        normalModeInputMethod: String(await joplin.settings.value(SettingKeys.normalModeInputMethod) ?? '').trim(),
        restoreInsertInputMethod: Boolean(await joplin.settings.value(SettingKeys.restoreInsertInputMethod)),
        debugLogging: Boolean(await joplin.settings.value(SettingKeys.debugLogging)),
    };
}
