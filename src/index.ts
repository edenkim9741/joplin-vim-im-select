import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { MacismController } from './core/imController';
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

    if (process.platform !== 'darwin') {
        if (!warnedUnsupportedPlatform) {
            warnedUnsupportedPlatform = true;
            console.warn('[Vim IM Select] v0.1.0 supports automatic IM switching on macOS only.');
        }
        return;
    }

    if (!settings.macismPath) {
        console.error('[Vim IM Select] macism executable path is empty. Check plugin settings.');
        return;
    }

    if (!settings.normalModeInputMethod) {
        console.error('[Vim IM Select] Normal mode input method is empty. Check plugin settings.');
        return;
    }

    const controller = new MacismController({
        executablePath: settings.macismPath,
    });

    const result = await stateMachine.transition(
        normalizeVimMode(typedMessage.mode),
        controller,
        {
            normalModeInputMethod: settings.normalModeInputMethod,
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
