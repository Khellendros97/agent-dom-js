import { describe, expect, it } from 'vitest';
import { failure, success } from '../src/result';

describe('result helpers', () => {
  it('creates success results', () => {
    expect(success({ value: 1 })).toEqual({ ok: true, data: { value: 1 } });
  });

  it('creates failure results', () => {
    expect(failure('ELEMENT_NOT_FOUND', 'Missing')).toEqual({
      ok: false,
      code: 'ELEMENT_NOT_FOUND',
      error: 'Missing',
    });
  });
});
