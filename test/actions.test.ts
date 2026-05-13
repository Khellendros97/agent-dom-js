import { describe, expect, it, vi } from 'vitest';
import { clickElement, fillElement, focusElement } from '../src/actions';

describe('actions', () => {
  it('clicks buttons', async () => {
    const button = document.createElement('button');
    const listener = vi.fn();
    button.addEventListener('click', listener);
    document.body.append(button);

    const result = await clickElement(button, 'button');

    expect(result).toEqual({ ok: true, data: { target: 'button' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fills inputs and dispatches input/change events', async () => {
    const input = document.createElement('input');
    const inputListener = vi.fn();
    const changeListener = vi.fn();
    input.addEventListener('input', inputListener);
    input.addEventListener('change', changeListener);
    document.body.append(input);

    const result = await fillElement(input, 'hello', 'input');

    expect(result.ok).toBe(true);
    expect(input.value).toBe('hello');
    expect(inputListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported fill targets', async () => {
    const div = document.createElement('div');
    const result = await fillElement(div, 'hello', 'div');

    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_ELEMENT' });
  });

  it('focuses focusable elements', async () => {
    const input = document.createElement('input');
    document.body.append(input);

    const result = await focusElement(input, 'input');

    expect(result.ok).toBe(true);
    expect(document.activeElement).toBe(input);
  });
});
