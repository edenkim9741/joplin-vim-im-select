# Joplin Vim IM Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a build-ready Joplin Desktop plugin that switches macOS input methods based on Vim mode.

**Architecture:** A CodeMirror content script detects Vim mode and posts messages to the Joplin main plugin. The main plugin serializes transitions through a tested state machine and an `execFile`-based `macism` controller.

**Tech Stack:** TypeScript, Joplin Plugin API, Webpack 5, Node.js `child_process`, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-29-joplin-vim-im-select-design.md`

## Global Constraints
- Desktop-only behavior; macOS is the supported controller platform in v0.1.0.
- CodeMirror 6 is primary; no CodeMirror 5-only implementation.
- External commands must use `execFile`, never interpolated shell strings.
- `npm run dist` must emit a `.jpl` archive.

---

### Task 1: Pure mode/state logic
**Files:** `src/core/mode.ts`, `src/core/stateMachine.ts`, `tests/core.test.js`
- [x] Define Vim mode normalization.
- [x] Define an injected IM controller interface and serialized transition behavior.
- [x] Add tests for command/insert transitions, duplicate suppression, and restore-disabled behavior.

### Task 2: macOS IM controller
**Files:** `src/core/imController.ts`
- [x] Wrap `macism` current/switch calls with `execFile`.
- [x] Trim stdout and reject empty IM identifiers.
- [x] Make executable path configurable.

### Task 3: Joplin integration
**Files:** `src/index.ts`, `src/settings.ts`, `src/contentScripts/vimModeWatcher.ts`
- [x] Register settings and CodeMirror content script.
- [x] Listen for mode messages and serialize transitions.
- [x] Prefer `vim-mode-change`; add guarded fat-cursor fallback.

### Task 4: Build/package/docs
**Files:** `package.json`, `webpack.config.js`, `plugin.config.json`, `tsconfig*.json`, `src/manifest.json`, `README.md`
- [x] Configure main and content-script bundles.
- [x] Package `dist/` as JPL in `publish/`.
- [x] Document build, installation, macism setup, settings, and troubleshooting.
