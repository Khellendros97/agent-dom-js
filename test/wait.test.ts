import { describe, expect, it } from 'vitest';
import { waitForCondition } from '../src/wait';

describe('waitForCondition', () => {
  it('resolves when condition becomes true', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 10);

    const result = await waitForCondition(() => ready, { timeoutMs: 200 });

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('times out', async () => {
    const result = await waitForCondition(() => false, { timeoutMs: 10, intervalMs: 5 });

    expect(result).toMatchObject({ ok: false, code: 'TIMEOUT' });
  });
});
