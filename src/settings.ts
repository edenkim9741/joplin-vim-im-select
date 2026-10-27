import joplin from 'api';
import { SettingItemType } from 'api/types';

export const SETTINGS_SECTION = 'vimImSelect';

export const SettingKeys = {
    macismPath: 'vimImSelect.macismPath',
    normalModeInputMethod: 'vimImSelect.normalModeInputMethod',
    windowsCommandPath: 'vimImSelect.windowsCommandPath',
    windowsNormalModeInputMethod: 'vimImSelect.windowsNormalModeInputMethod',
    windowsSetInputMethodArguments: 'vimImSelect.windowsSetInputMethodArguments',
    restoreInsertInputMethod: 'vimImSelect.restoreInsertInputMethod',
    debugLogging: 'vimImSelect.debugLogging',
} as const;

export interface PluginSettings {
    macismPath: string;
    normalModeInputMethod: string;
    windowsCommandPath: string;
    windowsNormalModeInputMethod: string;
    windowsSetInputMethodArguments: string;
    restoreInsertInputMethod: boolean;
    debugLogging: boolean;
}

export async function registerSettings(): Promise<void> {
    await joplin.settings.registerSection(SETTINGS_SECTION, {
        label: 'Vim IM Select',
        description: 'Automatically switch the input method when Vim mode changes.',
        iconName: 'fas fa-keyboard',
    });

    await joplin.settings.registerSettings({
        [SettingKeys.macismPath]: {
            value: '/opt/homebrew/bin/im-select',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'macOS im-select executable path',
            description: 'Apple Silicon Homebrew default: /opt/homebrew/bin/im-select. Intel Homebrew is usually /usr/local/bin/im-select.',
        },
        [SettingKeys.normalModeInputMethod]: {
            value: 'com.apple.keylayout.ABC',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'macOS Normal mode input method',
            description: 'Input method identifier used in Vim Normal and Visual modes on macOS.',
        },
        [SettingKeys.windowsCommandPath]: {
            value: 'im-select.exe',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Windows IM command path',
            description: 'Command executed on Windows to read and set the input method. Use an absolute path if Joplin cannot find it from PATH.',
        },
        [SettingKeys.windowsNormalModeInputMethod]: {
            value: '1033',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Windows Normal mode input method',
            description: 'Input method identifier passed to the Windows IM command in Vim Normal and Visual modes. For English (US), im-select commonly uses 1033.',
        },
        [SettingKeys.windowsSetInputMethodArguments]: {
            value: '{inputMethod}',
            type: SettingItemType.String,
            public: true,
            section: SETTINGS_SECTION,
            label: 'Windows set input method arguments',
            description: 'Arguments used when setting an input method. Use {inputMethod} as the placeholder. Quoted arguments are supported, for example: /set "{inputMethod}".',
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
        windowsCommandPath: String(await joplin.settings.value(SettingKeys.windowsCommandPath) ?? '').trim(),
        windowsNormalModeInputMethod: String(await joplin.settings.value(SettingKeys.windowsNormalModeInputMethod) ?? '').trim(),
        windowsSetInputMethodArguments: String(await joplin.settings.value(SettingKeys.windowsSetInputMethodArguments) ?? '').trim(),
        restoreInsertInputMethod: Boolean(await joplin.settings.value(SettingKeys.restoreInsertInputMethod)),
        debugLogging: Boolean(await joplin.settings.value(SettingKeys.debugLogging)),
    };
}
