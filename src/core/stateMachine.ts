import type { ModeClass } from './mode';

export interface InputMethodController {
    getCurrent(): Promise<string>;
    setCurrent(inputMethodId: string): Promise<void>;
}

export interface TransitionOptions {
    normalModeInputMethod: string;
    restoreInsertInputMethod: boolean;
}

export interface TransitionResult {
    changed: boolean;
    rememberedInsertInputMethod: string | null;
}

export class InputMethodStateMachine {
    private lastModeClass: ModeClass | null = null;
    private rememberedInsertInputMethod: string | null = null;

    async transition(
        nextModeClass: ModeClass,
        controller: InputMethodController,
        options: TransitionOptions,
    ): Promise<TransitionResult> {
        if (this.lastModeClass === nextModeClass) {
            return {
                changed: false,
                rememberedInsertInputMethod: this.rememberedInsertInputMethod,
            };
        }

        const previousModeClass = this.lastModeClass;

        if (nextModeClass === 'command') {
            // Normal/Visual mode
            if (previousModeClass === 'insert') {
                // Exiting insert mode: remember the current input method
                const current = (await controller.getCurrent()).trim();
                if (current) {
                    this.rememberedInsertInputMethod = current;
                }
            }
            // Switch to normal mode input method
            await controller.setCurrent(options.normalModeInputMethod);
        } else if (nextModeClass === 'command-line') {
            // Command-line mode (e.g., typing `:command`)
            if (previousModeClass === 'command') {
                // Transitioning from normal mode to command-line
                // Restore the previous input method if available and enabled
                if (
                    options.restoreInsertInputMethod
                    && this.rememberedInsertInputMethod
                    && this.rememberedInsertInputMethod !== options.normalModeInputMethod
                ) {
                    await controller.setCurrent(this.rememberedInsertInputMethod);
                }
            }
            // If transitioning from insert/command-line, keep the current input method
        } else if (nextModeClass === 'insert') {
            // Insert/Replace mode
            if (
                options.restoreInsertInputMethod
                && this.rememberedInsertInputMethod
                && this.rememberedInsertInputMethod !== options.normalModeInputMethod
            ) {
                await controller.setCurrent(this.rememberedInsertInputMethod);
            }
        }

        this.lastModeClass = nextModeClass;

        return {
            changed: true,
            rememberedInsertInputMethod: this.rememberedInsertInputMethod,
        };
    }

    snapshot(): { lastModeClass: ModeClass | null; rememberedInsertInputMethod: string | null } {
        return {
            lastModeClass: this.lastModeClass,
            rememberedInsertInputMethod: this.rememberedInsertInputMethod,
        };
    }
}
