# Joplin Vim IM Select

A Joplin Desktop plugin that automatically changes the macOS input method according to Vim mode.

- **Normal / Visual** → switches to a configured input method, defaulting to `com.apple.keylayout.ABC`.
- **Insert / Replace** → restores the input method that was active before leaving Insert/Replace mode.
- Uses `macism` and Node's `execFile` (no shell interpolation).
- Targets Joplin's CodeMirror 6 Markdown editor.

## 1. Prerequisites

### Joplin

Use Joplin Desktop 3.1 or newer and enable Vim keybindings in Joplin's editor settings.

### macism

Install `macism` with Homebrew:

```bash
brew install macism
```

Check that it works:

```bash
macism
```

It should print the current input method identifier, for example:

```text
com.apple.inputmethod.Korean.2SetKorean
```

Try switching to ABC/English:

```bash
macism com.apple.keylayout.ABC
```

Apple Silicon Homebrew usually installs it here:

```text
/opt/homebrew/bin/macism
```

Intel Homebrew usually installs it here:

```text
/usr/local/bin/macism
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

### macism executable path

Default:

```text
/opt/homebrew/bin/macism
```

On an Intel Mac, change it to:

```text
/usr/local/bin/macism
```

You can confirm the correct path in Terminal with:

```bash
which macism
```

### Normal mode input method

Default:

```text
com.apple.keylayout.ABC
```

To find an identifier for another input method, switch to it in macOS and run:

```bash
macism
```

### Restore Insert mode input method

Enabled by default. When enabled, the plugin remembers the IM active immediately before Vim leaves Insert/Replace mode and restores it on the next Insert/Replace entry.

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

The content script runs inside Joplin's CodeMirror 6 Markdown editor.

1. It first tries to subscribe to CodeMirror's `vim-mode-change` event.
2. It also observes the Vim `cm-fat-cursor` state as a fallback.
3. The fallback does **not** infer Insert mode until Vim has actually been observed, so a non-Vim editor should not trigger IM switching.
4. The content script sends only mode messages to the main Joplin plugin. `macism` is executed only from the main plugin process.

## 7. Troubleshooting

### Normal mode does not switch to English

Check these in order:

```bash
which macism
macism
macism com.apple.keylayout.ABC
```

Then make sure **Vim IM Select → macism executable path** exactly matches `which macism`.

Because Joplin is a GUI application, relying on the shell `PATH` can be unreliable. An absolute executable path is recommended.

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

If Vim mode messages appear but `macism` fails, the problem is normally the executable path or macOS permissions/environment.

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
│   │   ├── imController.ts      # macism execFile wrapper
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

Version 0.1.0 intentionally implements the macOS path first. The controller and state-machine boundaries are separated so Windows `im-select.exe` or Linux `fcitx5-remote`/IBus support can be added without rewriting the Vim detection layer.
