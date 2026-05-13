import { describe, expect, it } from 'vitest';
import { createAgentDom } from '../src/agent-dom';

describe('createAgentDom', () => {
  it('snapshots then clicks by ref', async () => {
    document.body.innerHTML = '<button>保存</button><p role="status"></p>';
    document.querySelector('button')!.addEventListener('click', () => {
      document.querySelector('[role="status"]')!.textContent = '已保存';
    });

    const agentDom = createAgentDom();
    const snapshot = agentDom.snapshot();
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error(snapshot.error);

    expect(snapshot.data.text).toContain('[ref=e1]');
    const click = await agentDom.click('@e1');

    expect(click.ok).toBe(true);
    expect(document.querySelector('[role="status"]')!.textContent).toBe('已保存');
  });

  it('fills by selector and reads text', async () => {
    document.body.innerHTML = '<label for="name">姓名</label><input id="name" /><div id="output">Hello</div>';
    const agentDom = createAgentDom();

    const fill = await agentDom.fill('#name', '张三');

    expect(fill.ok).toBe(true);
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('张三');
    expect(agentDom.getText('#output')).toEqual({ ok: true, data: 'Hello' });
  });
});
