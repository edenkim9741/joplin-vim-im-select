export type VimMode = 'normal' | 'visual' | 'insert' | 'replace' | 'command-line';
export type ModeClass = 'command' | 'command-line' | 'insert';

export function isVimMode(value: unknown): value is VimMode {
    return value === 'normal'
        || value === 'visual'
        || value === 'insert'
        || value === 'replace'
        || value === 'command-line';
}

export function normalizeVimMode(mode: VimMode): ModeClass {
    if (mode === 'command-line') return 'command-line';
    return mode === 'insert' || mode === 'replace' ? 'insert' : 'command';
}
