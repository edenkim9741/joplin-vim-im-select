# Joplin Vim IM Select

A Joplin Desktop plugin that automatically changes the input method according to Vim mode on macOS and Windows.

- **Normal / Visual** → switches to a configured input method, defaulting to `com.apple.keylayout.ABC` on macOS and `1033` on Windows.
- **Insert / Replace** → restores the input method that was active before leaving Insert/Replace mode.
- Uses a configurable external command and Node's `execFile` (no shell interpolation).
- Supports both Joplin's CodeMirror 6 editor and legacy CodeMirror 5 Markdown editor.

## 1. Prerequisites

### Joplin

Use Joplin Desktop 3.1 or newer and enable Vim keybindings in Joplin's editor settings.

### macOS: im-select

use your own `im-select` software.

It should print the current input method identifier, for example:

```text
com.apple.inputmethod.Korean.2SetKorean
```

Try switching to ABC/English:

```bash
im-select com.apple.keylayout.ABC
```

Installation examples:

```bash
# Homebrew on Apple Silicon
brew install im-select

# Or download from https://github.com/daipeihust/im-select
```

Confirm the installed path:

```bash
which im-select
```

### Windows: input-method command

Install an input-method switching command that can:

1. Print the current input method identifier when run without arguments.
2. Switch input method when run with a configured argument template.

For `im-select.exe`, a common English (US) identifier is:

```text
1033
```

Try switching to English:

```powershell
im-select.exe 1033
```

If Joplin cannot find `im-select.exe` from `PATH`, set **Windows IM command path** to an absolute path such as:

```text
C:\Tools\im-select.exe
```

## 2. Build

From this project directory:

```bash
npm install
npm test
npm run dist
```

The installable plugin will be created at:

```text
publish/io.github.joplin-vim-im-select.jpl
```

If you only want the plugin artifact and do not want to run tests first:

```bash
npm install
npm run dist
```

## 3. Install in Joplin

1. Open Joplin Desktop.
2. Open **Settings/Preferences → Plugins**.
3. Choose **Install from file**.
4. Select `publish/io.github.joplin-vim-im-select.jpl`.
5. Restart Joplin if requested.
6. Make sure Vim keybindings are enabled.

## 4. Plugin settings

Open Joplin settings and find **Vim IM Select**.

### macOS im-select executable path

Default (if installed via Homebrew):

```text
/opt/homebrew/bin/im-select
```

If you compiled or downloaded manually, find the path with:

```bash
which im-select
```

Copy this exact path into the plugin settings.

### macOS Normal mode input method

Default:

```text
com.apple.keylayout.ABC
```

To find an identifier for another input method, switch to it in macOS and run:

```bash
im-select
```

### Windows IM command path

Default:

```text
im-select.exe
```

Use an absolute path if Joplin cannot resolve it from `PATH`.

### Windows Normal mode input method

Default:

```text
1033
```

Set this to the identifier your Windows IM command expects for English or your preferred Normal/Visual mode input method.

### Windows set input method arguments

Default:

```text
{inputMethod}
```

The plugin replaces `{inputMethod}` with **Windows Normal mode input method** or the remembered Insert-mode input method, then executes the command without a shell.

Examples:

```text
{inputMethod}
/set "{inputMethod}"
--switch {inputMethod}
```

### Restore Insert mode input method

Enabled by default. When enabled, the plugin remembers the IM active immediately before Vim leaves Insert/Replace mode and restores it on the next Insert/Replace entry.

If your Windows command can switch input methods but cannot print the current input method when run without arguments, disable this setting. In that mode, pressing `Esc` still switches to the configured Normal/Visual mode input method, but Insert-mode restoration is skipped.

### Debug logging

Disabled by default. Enable it when troubleshooting and inspect Joplin's developer console for messages prefixed with:

```text
[Vim IM Select]
```

## 5. Expected behavior

A typical Korean/English workflow is:

```text
Insert mode: Korean
    ↓ Esc
Plugin remembers Korean
    ↓
Normal mode: ABC/English
    ↓ i / a / o / ...
Insert mode: Korean restored
```

Visual mode is treated like Normal mode. Replace mode is treated like Insert mode.

## 6. How Vim mode detection works

The plugin registers separate content scripts for CodeMirror 6 and CodeMirror 5. Joplin loads the matching watcher for the selected Markdown editor, and the legacy script has no CodeMirror 6 dependency.

1. It subscribes to CodeMirror's `vim-mode-change` event and reads the initial Vim state when available.
2. In the CodeMirror 6 editor, it also observes the Vim `cm-fat-cursor` state as a fallback. This fallback does **not** infer Insert mode until Vim has actually been observed.
3. In the legacy CodeMirror 5 editor, it listens to the Vim addon's mode-change signal and watches for command-line UI.
4. The content script sends only mode messages to the main Joplin plugin. The configured input-method command is executed only from the main plugin process.

## 7. Troubleshooting

### Normal mode does not switch to English

On macOS, check these in order:

```bash
which im-select
im-select
im-select com.apple.keylayout.ABC
```

Then make sure **Vim IM Select → macOS im-select executable path** exactly matches `which im-select`.

Because Joplin is a GUI application, relying on the shell `PATH` can be unreliable. An absolute executable path is recommended.

On Windows, check these in PowerShell:

```powershell
im-select.exe
im-select.exe 1033
```

Then make sure **Vim IM Select → Windows IM command path**, **Windows Normal mode input method**, and **Windows set input method arguments** match the command you tested.

### Insert mode is not restored

1. Enable **Restore Insert mode input method**.
2. Enter Insert mode.
3. Select Korean (or another IM).
4. Press `Esc` once. The plugin records the IM at this transition.
5. Re-enter Insert mode.

The plugin intentionally has nothing to restore until it has observed at least one Insert → Normal transition.

### Nothing happens at all

Make sure Joplin Vim keybindings are enabled. Then enable the plugin's **Debug logging** setting and inspect the developer console.

You should see messages similar to:

```text
[Vim IM Select] Vim mode: normal
[Vim IM Select] Vim mode: insert
```

If Vim mode messages appear but the IM command fails, the problem is normally the executable path, arguments, or OS permissions/environment.

## 8. Development layout

```text
joplin-vim-im-select/
├── api/                         # Minimal Joplin API typings used by this project
├── docs/superpowers/            # Design and implementation notes
├── scripts/
│   └── createArchive.js         # Creates the .jpl archive
├── src/
│   ├── contentScripts/
│   │   └── vimModeWatcher.ts    # CodeMirror/Vim mode detection
│   ├── core/
│   │   ├── imController.ts      # external IM command execFile wrapper
│   │   ├── mode.ts              # Vim mode normalization
│   │   └── stateMachine.ts      # IM transition state
│   ├── index.ts                 # Joplin plugin entry point
│   ├── manifest.json
│   └── settings.ts
├── tests/
│   └── core.test.js
├── package.json
├── plugin.config.json
├── tsconfig.json
├── tsconfig.test.json
└── webpack.config.js
```

## Current scope

Version 0.1.0 supports macOS and Windows. The controller and state-machine boundaries are separated so Linux `fcitx5-remote`/IBus support can be added without rewriting the Vim detection layer.
