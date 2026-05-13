import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';
import { resolveTarget } from '../src/target';

describe('resolveTarget', () => {
  it('resolves refs before selectors', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const registry = new RefRegistry();
    const button = document.getElementById('save')!;
    registry.register(button);

    const result = resolveTarget('@e1', document, registry, {});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(button);
  });

  it('resolves css selectors', () => {
    document.body.innerHTML = '<button class="save">保存</button>';
    const result = resolveTarget('.save', document, new RefRegistry(), {});

    expect(result.ok).toBe(true);
  });

  it('blocks denied selectors', () => {
    document.body.innerHTML = '<button class="danger">删除</button>';
    const result = resolveTarget('.danger', document, new RefRegistry(), { denySelectors: ['.danger'] });

    expect(result).toMatchObject({ ok: false, code: 'POLICY_BLOCKED' });
  });
});
