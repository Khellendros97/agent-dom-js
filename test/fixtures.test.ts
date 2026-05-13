import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAgentDom } from '../src/agent-dom';

describe('web-test fixtures', () => {
  it('can snapshot and fill the static HTML fixture', async () => {
    const html = readFileSync(resolve('web-test/static-html/index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    const agentDom = createAgentDom();
    const snapshot = agentDom.snapshot();

    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error(snapshot.error);
    expect(snapshot.data.text).toContain('提交资料');

    const fill = await agentDom.fill('#name', '测试用户');

    expect(fill.ok).toBe(true);
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('测试用户');
  });
});
