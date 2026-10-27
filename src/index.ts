import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { ExternalInputMethodController, parseCommandLineArgs } from './core/imController';
import { isVimMode, normalizeVimMode } from './core/mode';
import { InputMethodStateMachine } from './core/stateMachine';
import { loadSettings, registerSettings } from './settings';

const CONTENT_SCRIPT_ID = 'vim-im-select-mode-watcher';
const stateMachine = new InputMethodStateMachine();
let transitionQueue: Promise<void> = Promise.resolve();
let warnedUnsupportedPlatform = false;

function log(debugEnabled: boolean, ...args: unknown[]): void {
    if (debugEnabled) {
        console.info('[Vim IM Select]', ...args);
    }
}

async function handleModeMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;

    const typedMessage = message as { type?: unknown; mode?: unknown };
    if (typedMessage.type !== 'vim-mode-change' || !isVimMode(typedMessage.mode)) return;

    const settings = await loadSettings();
    log(settings.debugLogging, 'Vim mode:', typedMessage.mode);

    if (process.platform !== 'darwin' && process.platform !== 'win32') {
        if (!warnedUnsupportedPlatform) {
            warnedUnsupportedPlatform = true;
            console.warn('[Vim IM Select] Automatic IM switching is supported on macOS and Windows only.');
        }
        return;
    }

    const executablePath = process.platform === 'win32'
        ? settings.windowsCommandPath
        : settings.macismPath;
    const normalModeInputMethod = process.platform === 'win32'
        ? settings.windowsNormalModeInputMethod
        : settings.normalModeInputMethod;
    const setInputMethodArgsTemplate = process.platform === 'win32'
        ? parseCommandLineArgs(settings.windowsSetInputMethodArguments)
        : ['{inputMethod}'];

    if (!executablePath) {
        console.error('[Vim IM Select] Input method command path is empty. Check plugin settings.');
        return;
    }

    if (!normalModeInputMethod) {
        console.error('[Vim IM Select] Normal mode input method is empty. Check plugin settings.');
        return;
    }

    const controller = new ExternalInputMethodController({
        executablePath,
        setInputMethodArgsTemplate,
    });

    const result = await stateMachine.transition(
        normalizeVimMode(typedMessage.mode),
        controller,
        {
            normalModeInputMethod,
            restoreInsertInputMethod: settings.restoreInsertInputMethod,
        },
    );

    log(
        settings.debugLogging,
        'Transition complete:',
        normalizeVimMode(typedMessage.mode),
        'remembered IM:',
        result.rememberedInsertInputMethod,
    );
}

joplin.plugins.register({
    onStart: async () => {
        await registerSettings();

        await joplin.contentScripts.onMessage(CONTENT_SCRIPT_ID, async (message: unknown) => {
            transitionQueue = transitionQueue
                .then(() => handleModeMessage(message))
                .catch((error: unknown) => {
                    console.error('[Vim IM Select] Mode transition failed:', error);
                });

            await transitionQueue;
            return null;
        });

        await joplin.contentScripts.register(
            ContentScriptType.CodeMirrorPlugin,
            CONTENT_SCRIPT_ID,
            './contentScripts/vimModeWatcher.js',
        );

        console.info('[Vim IM Select] Plugin started.');
    },
});
