const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeVimMode } = require('../.test-dist/src/core/mode.js');
const { InputMethodStateMachine } = require('../.test-dist/src/core/stateMachine.js');

class FakeController {
    constructor(current = 'com.apple.inputmethod.Korean.2SetKorean') {
        this.current = current;
        this.calls = [];
    }

    async getCurrent() {
        this.calls.push(['get']);
        return this.current;
    }

    async setCurrent(inputMethodId) {
        this.calls.push(['set', inputMethodId]);
        this.current = inputMethodId;
    }
}

test('normalizes Vim modes into insert and command classes', () => {
    assert.equal(normalizeVimMode('normal'), 'command');
    assert.equal(normalizeVimMode('visual'), 'command');
    assert.equal(normalizeVimMode('insert'), 'insert');
    assert.equal(normalizeVimMode('replace'), 'insert');
});

test('initial command mode forces the configured normal-mode IM', async () => {
    const machine = new InputMethodStateMachine();
    const controller = new FakeController();

    await machine.transition('command', controller, {
        normalModeInputMethod: 'com.apple.keylayout.ABC',
        restoreInsertInputMethod: true,
    });

    assert.deepEqual(controller.calls, [
        ['set', 'com.apple.keylayout.ABC'],
    ]);
});

test('leaving insert remembers its IM, normalizes to ABC, and restores on re-entry', async () => {
    const machine = new InputMethodStateMachine();
    const controller = new FakeController('com.apple.keylayout.ABC');
    const options = {
        normalModeInputMethod: 'com.apple.keylayout.ABC',
        restoreInsertInputMethod: true,
    };

    await machine.transition('insert', controller, options);
    controller.current = 'com.apple.inputmethod.Korean.2SetKorean';
    await machine.transition('command', controller, options);
    await machine.transition('insert', controller, options);

    assert.deepEqual(controller.calls, [
        ['get'],
        ['set', 'com.apple.keylayout.ABC'],
        ['set', 'com.apple.inputmethod.Korean.2SetKorean'],
    ]);
    assert.equal(
        machine.snapshot().rememberedInsertInputMethod,
        'com.apple.inputmethod.Korean.2SetKorean',
    );
});

test('duplicate mode-class transitions do not execute IM commands', async () => {
    const machine = new InputMethodStateMachine();
    const controller = new FakeController();
    const options = {
        normalModeInputMethod: 'com.apple.keylayout.ABC',
        restoreInsertInputMethod: true,
    };

    await machine.transition('command', controller, options);
    controller.calls.length = 0;
    const result = await machine.transition('command', controller, options);

    assert.equal(result.changed, false);
    assert.deepEqual(controller.calls, []);
});

test('restore can be disabled while still remembering the insert IM', async () => {
    const machine = new InputMethodStateMachine();
    const controller = new FakeController('com.apple.inputmethod.Korean.2SetKorean');
    const options = {
        normalModeInputMethod: 'com.apple.keylayout.ABC',
        restoreInsertInputMethod: false,
    };

    await machine.transition('insert', controller, options);
    await machine.transition('command', controller, options);
    controller.calls.length = 0;
    await machine.transition('insert', controller, options);

    assert.deepEqual(controller.calls, []);
    assert.equal(
        machine.snapshot().rememberedInsertInputMethod,
        'com.apple.inputmethod.Korean.2SetKorean',
    );
});
