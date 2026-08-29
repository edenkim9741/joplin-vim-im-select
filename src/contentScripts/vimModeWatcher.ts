import { ViewPlugin, type EditorView } from '@codemirror/view';
import { isVimMode, type VimMode } from '../core/mode';

type PostMessage = (message: unknown) => Promise<unknown>;

interface ContentScriptContext {
    contentScriptId: string;
    postMessage: PostMessage;
}

interface CodeMirrorControlLike {
    editor?: unknown;
    cm6?: EditorView;
    addExtension(extension: unknown): void;
}

interface EventEmitterLike {
    on(eventName: string, callback: (payload: unknown) => void): void;
    off?(eventName: string, callback: (payload: unknown) => void): void;
    getOption?(name: string): unknown;
    state?: {
        vim?: {
            insertMode?: boolean;
            visualMode?: boolean;
        };
    };
}

function asEventEmitter(value: unknown): EventEmitterLike | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as EventEmitterLike;
    return typeof candidate.on === 'function' ? candidate : null;
}

function modeFromCompatibilityEditor(editor: EventEmitterLike): VimMode | null {
    const vimState = editor.state?.vim;
    if (vimState) {
        if (vimState.insertMode) return 'insert';
        if (vimState.visualMode) return 'visual';
        // Command-line mode will be detected via DOM in readModeFromDom()
        return 'normal';
    }

    if (typeof editor.getOption === 'function') {
        const keyMap = editor.getOption('keyMap');
        if (keyMap === 'vim-insert') return 'insert';
        if (keyMap === 'vim-replace') return 'replace';
        if (keyMap === 'vim') return 'normal';
    }

    return null;
}

function findCompatibilityEditor(control: CodeMirrorControlLike, view: EditorView): EventEmitterLike | null {
    const candidates: unknown[] = [
        control.editor,
        (view as unknown as { cm?: unknown }).cm,
        (control as unknown as { cm?: unknown }).cm,
    ];

    for (const candidate of candidates) {
        const emitter = asEventEmitter(candidate);
        if (emitter) return emitter;
    }

    return null;
}

export default (context: ContentScriptContext) => {
    return {
        plugin: (codeMirrorControl: CodeMirrorControlLike) => {
            if (!codeMirrorControl.cm6) return;

            const watcherExtension = ViewPlugin.fromClass(class {
                private lastMode: VimMode | null = null;
                private vimSeen = false;
                private readonly compatibilityEditor: EventEmitterLike | null;
                private readonly mutationObserver: MutationObserver;
                private readonly onVimModeChange: (payload: unknown) => void;

                constructor(private readonly view: EditorView) {
                    this.compatibilityEditor = findCompatibilityEditor(codeMirrorControl, view);
                    this.onVimModeChange = (payload: unknown) => {
                        const mode = (payload as { mode?: unknown } | null)?.mode;
                        if (isVimMode(mode)) {
                            this.vimSeen = true;
                            void this.emit(mode);
                        }
                    };

                    if (this.compatibilityEditor) {
                        this.compatibilityEditor.on('vim-mode-change', this.onVimModeChange);
                        const initialMode = modeFromCompatibilityEditor(this.compatibilityEditor);
                        if (initialMode) {
                            this.vimSeen = true;
                            void this.emit(initialMode);
                        }
                    }

                    this.mutationObserver = new MutationObserver(() => {
                        this.readModeFromDom();
                    });
                    this.mutationObserver.observe(this.view.dom, {
                        attributes: true,
                        attributeFilter: ['class'],
                    });

                    this.readModeFromDom();
                }

                destroy(): void {
                    this.mutationObserver.disconnect();
                    if (this.compatibilityEditor?.off) {
                        this.compatibilityEditor.off('vim-mode-change', this.onVimModeChange);
                    }
                }

                private readModeFromDom(): void {
                    // Check for command-line mode (user typing : or / commands)
                    // Command-line input may appear in different ways depending on Vim implementation
                    const hasCommandLineIndicators =
                        this.view.dom.classList.contains('cm-vim-command-line') ||
                        this.view.dom.classList.contains('cm-vim-command-mode') ||
                        !!this.view.dom.querySelector(
                            '.cm-vim-command, .vim-command-line, input.vim-command'
                        );

                    if (hasCommandLineIndicators) {
                        this.vimSeen = true;
                        void this.emit('command-line');
                        return;
                    }

                    const hasFatCursor = this.view.dom.classList.contains('cm-fat-cursor');
                    if (hasFatCursor) {
                        this.vimSeen = true;
                        void this.emit('normal');
                        return;
                    }

                    // The absence of cm-fat-cursor alone does not prove Vim mode is enabled.
                    // Only infer Insert mode after Vim has been observed in this editor.
                    if (this.vimSeen) {
                        void this.emit('insert');
                    }
                }

                private async emit(mode: VimMode): Promise<void> {
                    if (mode === this.lastMode) return;
                    this.lastMode = mode;

                    try {
                        await context.postMessage({
                            type: 'vim-mode-change',
                            mode,
                        });
                    } catch (error) {
                        console.error('[Vim IM Select] Failed to post Vim mode:', error);
                    }
                }
            });

            codeMirrorControl.addExtension(watcherExtension);
        },
    };
};
