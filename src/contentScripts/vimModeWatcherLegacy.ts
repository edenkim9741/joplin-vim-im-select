import { isVimMode, type VimMode } from '../core/mode';

type PostMessage = (message: unknown) => Promise<unknown>;

interface ContentScriptContext {
    contentScriptId: string;
    postMessage: PostMessage;
}

interface LegacyCodeMirrorEditor {
    on(eventName: string, callback: (...args: unknown[]) => void): void;
    off?(eventName: string, callback: (...args: unknown[]) => void): void;
    getOption(name: string): unknown;
    getWrapperElement(): HTMLElement;
    state?: {
        vim?: {
            insertMode?: boolean;
            visualMode?: boolean;
        };
    };
}

function isLegacyCodeMirrorEditor(value: unknown): value is LegacyCodeMirrorEditor {
    if (!value || typeof value !== 'object') return false;
    const editor = value as LegacyCodeMirrorEditor;
    return typeof editor.on === 'function'
        && typeof editor.getOption === 'function'
        && typeof editor.getWrapperElement === 'function';
}

interface LegacyCodeMirrorModule {
    cm6?: unknown;
    defineOption(
        name: string,
        defaultValue: unknown,
        callback: (this: unknown, editor: unknown) => void,
    ): void;
}

function isLegacyCodeMirrorModule(value: unknown): value is LegacyCodeMirrorModule {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;
    const codeMirror = value as LegacyCodeMirrorModule;
    return !codeMirror.cm6 && typeof codeMirror.defineOption === 'function';
}

function modeFromEditor(editor: LegacyCodeMirrorEditor): VimMode | null {
    const vimState = editor.state?.vim;
    if (vimState) {
        if (vimState.insertMode) return 'insert';
        if (vimState.visualMode) return 'visual';
        return 'normal';
    }

    const keyMap = editor.getOption('keyMap');
    if (keyMap === 'vim-insert') return 'insert';
    if (keyMap === 'vim-replace') return 'replace';
    if (keyMap === 'vim') return 'normal';
    return null;
}

function modeFromEvent(args: unknown[]): VimMode | null {
    // CM5 Vim versions signal either (mode) or (editor, mode).
    for (const arg of args) {
        const mode = (arg as { mode?: unknown } | null)?.mode;
        if (isVimMode(mode)) return mode;
    }
    return null;
}

function hasCommandLine(root: HTMLElement): boolean {
    return !!root.querySelector(
        '.CodeMirror-dialog, .cm-vim-command, .vim-command-line, input.vim-command',
    );
}

async function postMode(context: ContentScriptContext, mode: VimMode): Promise<void> {
    try {
        await context.postMessage({ type: 'vim-mode-change', mode });
    } catch (error) {
        console.error('[Vim IM Select] Failed to post Vim mode:', error);
    }
}

function watchEditor(editor: LegacyCodeMirrorEditor, context: ContentScriptContext): void {
    let lastMode: VimMode | null = null;
    const root = editor.getWrapperElement();
    const emit = (mode: VimMode): void => {
        if (mode === lastMode) return;
        lastMode = mode;
        void postMode(context, mode);
    };

    const onModeChange = (...args: unknown[]): void => {
        const mode = modeFromEvent(args);
        if (mode) emit(mode);
    };

    editor.on('vim-mode-change', onModeChange);

    const observer = new MutationObserver(() => {
        if (hasCommandLine(root)) {
            emit('command-line');
        } else {
            const currentMode = modeFromEditor(editor);
            if (currentMode) emit(currentMode);
        }
    });
    observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
    });

    const initialMode = modeFromEditor(editor);
    if (initialMode) emit(initialMode);
    else if (hasCommandLine(root)) emit('command-line');

    // Release the listener when Joplin removes this editor instance.
    const parent = root.parentElement;
    if (parent) {
        const detachObserver = new MutationObserver(() => {
            if (root.isConnected) return;
            observer.disconnect();
            detachObserver.disconnect();
            editor.off?.('vim-mode-change', onModeChange);
        });
        detachObserver.observe(parent, { childList: true });
    }
}

export default (context: ContentScriptContext) => ({
    plugin: (codeMirror: unknown) => {
        if (!isLegacyCodeMirrorModule(codeMirror)) return;

        // Joplin passes the CodeMirror 5 module to `plugin`, not an editor
        // instance. A custom option lets us attach to each created editor.
        codeMirror.defineOption('vim-im-select-watch', false, function(editor) {
            // CodeMirror 5 supplies the editor as the first callback argument.
            // Some Joplin versions also bind `this` to the editor.
            const editorInstance = isLegacyCodeMirrorEditor(editor)
                ? editor
                : isLegacyCodeMirrorEditor(this) ? this : null;

            if (!editorInstance) {
                console.warn('[Vim IM Select] Could not attach the legacy watcher: CodeMirror did not provide an editor instance.');
                return;
            }

            watchEditor(editorInstance, context);
        });
    },
    codeMirrorOptions: {
        'vim-im-select-watch': true,
    },
});
