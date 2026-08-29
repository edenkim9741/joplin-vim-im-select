# Joplin Vim IM Select — Design

## Goal
Build a Joplin Desktop plugin that automatically switches the macOS input method when Joplin's Vim editor moves between Insert/Replace and Normal/Visual modes.

## Scope
- Joplin Desktop, CodeMirror 6 Markdown editor.
- macOS first release.
- `macism` as the default IM controller.
- Normal/Visual mode forces a configured default IM (normally ABC/English).
- Insert/Replace mode restores the IM that was active immediately before leaving Insert/Replace mode.
- Joplin settings expose controller path, normal-mode IM ID, restore toggle, and debug logging.
- No shell command interpolation: external process execution uses Node `execFile`.

## Architecture
1. `src/contentScripts/vimModeWatcher.ts` runs inside the Markdown editor and detects Vim mode changes.
2. It prefers a CodeMirror-compatible `vim-mode-change` event. If unavailable, it observes the Vim fat-cursor class as a fallback.
3. It sends normalized mode messages to `src/index.ts` through `context.postMessage`.
4. `src/index.ts` serializes mode transitions and delegates IM switching to `InputMethodStateMachine`.
5. `src/core/imController.ts` invokes `macism` using `execFile`.
6. `src/core/stateMachine.ts` owns remembered Insert-mode IM state and duplicate-transition suppression.

## Error handling
- Unsupported platforms log a warning and do not execute the controller.
- Empty/malformed settings are rejected with readable logs.
- `macism` execution errors never crash Joplin; they are logged.
- A failed transition does not poison the serial queue.

## Testing
- Unit tests cover mode normalization and the state machine using a fake IM controller.
- TypeScript type-checking is part of `npm test`.
- `npm run dist` produces `publish/io.github.joplin-vim-im-select.jpl`.
