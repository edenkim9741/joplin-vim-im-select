import { execFile } from 'node:child_process';
import type { InputMethodController } from './stateMachine';

export interface MacismControllerOptions {
    executablePath: string;
    timeoutMs?: number;
}

export class MacismController implements InputMethodController {
    private readonly executablePath: string;
    private readonly timeoutMs: number;

    constructor(options: MacismControllerOptions) {
        this.executablePath = options.executablePath.trim();
        this.timeoutMs = options.timeoutMs ?? 3000;

        if (!this.executablePath) {
            throw new Error('macism executable path is empty.');
        }
    }

    async getCurrent(): Promise<string> {
        const stdout = await this.run([]);
        const inputMethodId = stdout.trim();

        if (!inputMethodId) {
            throw new Error('macism returned an empty input method identifier.');
        }

        return inputMethodId;
    }

    async setCurrent(inputMethodId: string): Promise<void> {
        const target = inputMethodId.trim();
        if (!target) {
            throw new Error('Target input method identifier is empty.');
        }

        await this.run([target]);
    }

    private run(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(
                this.executablePath,
                args,
                {
                    timeout: this.timeoutMs,
                    windowsHide: true,
                },
                (error, stdout, stderr) => {
                    if (error) {
                        const detail = String(stderr || '').trim();
                        const suffix = detail ? `: ${detail}` : '';
                        reject(new Error(`Failed to execute ${this.executablePath}${suffix}`));
                        return;
                    }

                    resolve(String(stdout ?? ''));
                },
            );
        });
    }
}
