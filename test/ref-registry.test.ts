import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';

describe('RefRegistry', () => {
  it('assigns refs and resolves supported ref formats', () => {
    const registry = new RefRegistry();
    const button = document.createElement('button');
    document.body.append(button);

    const ref = registry.register(button);

    expect(ref).toBe('e1');
    expect(registry.resolve('e1')).toBe(button);
    expect(registry.resolve('@e1')).toBe(button);
    expect(registry.resolve('ref=e1')).toBe(button);
  });

  it('returns null for stale refs', () => {
    const registry = new RefRegistry();
    const button = document.createElement('button');
    document.body.append(button);
    const ref = registry.register(button);
    button.remove();

    expect(registry.resolve(ref)).toBeNull();
  });

  it('clears refs and restarts numbering', () => {
    const registry = new RefRegistry();
    registry.register(document.createElement('button'));
    registry.clear();

    expect(registry.register(document.createElement('input'))).toBe('e1');
  });
});
