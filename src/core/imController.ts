import { execFile } from 'node:child_process';
import type { InputMethodController } from './stateMachine';

export interface ExternalInputMethodControllerOptions {
    executablePath: string;
    setInputMethodArgsTemplate?: string[];
    timeoutMs?: number;
}

export class ExternalInputMethodController implements InputMethodController {
    private readonly executablePath: string;
    private readonly setInputMethodArgsTemplate: string[];
    private readonly timeoutMs: number;

    constructor(options: ExternalInputMethodControllerOptions) {
        this.executablePath = options.executablePath.trim();
        this.setInputMethodArgsTemplate = options.setInputMethodArgsTemplate?.length
            ? options.setInputMethodArgsTemplate
            : ['{inputMethod}'];
        this.timeoutMs = options.timeoutMs ?? 3000;

        if (!this.executablePath) {
            throw new Error('Input method command path is empty.');
        }
    }

    async getCurrent(): Promise<string> {
        const stdout = await this.run([]);
        const inputMethodId = stdout.trim();

        if (!inputMethodId) {
            throw new Error('Input method command returned an empty input method identifier.');
        }

        return inputMethodId;
    }

    async setCurrent(inputMethodId: string): Promise<void> {
        const target = inputMethodId.trim();
        if (!target) {
            throw new Error('Target input method identifier is empty.');
        }

        await this.run(formatInputMethodArgs(this.setInputMethodArgsTemplate, target));
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

export function formatInputMethodArgs(argsTemplate: string[], inputMethodId: string): string[] {
    if (!argsTemplate.length) return [inputMethodId];

    let replaced = false;
    const args = argsTemplate.map((arg) => {
        if (arg.includes('{inputMethod}')) {
            replaced = true;
            return arg.replace(/\{inputMethod\}/g, inputMethodId);
        }
        return arg;
    });

    if (!replaced) {
        args.push(inputMethodId);
    }

    return args;
}

export function parseCommandLineArgs(value: string): string[] {
    const args: string[] = [];
    let current = '';
    let quote: '"' | '\'' | null = null;
    let escaping = false;

    for (const char of value.trim()) {
        if (escaping) {
            current += char;
            escaping = false;
            continue;
        }

        if (char === '\\') {
            escaping = true;
            continue;
        }

        if (quote) {
            if (char === quote) {
                quote = null;
            } else {
                current += char;
            }
            continue;
        }

        if (char === '"' || char === '\'') {
            quote = char;
            continue;
        }

        if (/\s/.test(char)) {
            if (current) {
                args.push(current);
                current = '';
            }
            continue;
        }

        current += char;
    }

    if (escaping) {
        current += '\\';
    }

    if (current) {
        args.push(current);
    }

    return args;
}

export class MacismController extends ExternalInputMethodController {}
