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

  it('highlights by selector through the public API', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const button = document.getElementById('save')!;
    button.getBoundingClientRect = () => ({
      x: 20,
      y: 30,
      left: 20,
      top: 30,
      right: 120,
      bottom: 70,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });
    const agentDom = createAgentDom();

    const result = agentDom.highlight('#save', { maskZIndex: 42 });

    expect(result).toEqual({ ok: true, data: { target: '#save' } });
    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
    expect(document.querySelector<HTMLElement>('[data-agent-dom-highlight-mask]')?.style.zIndex).toBe('42');
  });

  it('allows highlight in readOnly mode', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const button = document.getElementById('save')!;
    button.getBoundingClientRect = () => ({
      x: 20,
      y: 30,
      left: 20,
      top: 30,
      right: 120,
      bottom: 70,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });
    const agentDom = createAgentDom({ readOnly: true });

    const result = agentDom.highlight('#save');

    expect(result.ok).toBe(true);
    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
  });

  it('replaces the previous highlight on repeated calls', () => {
    document.body.innerHTML = '<button id="first">一</button><button id="second">二</button>';
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('button'))) {
      element.getBoundingClientRect = () => ({
        x: 20,
        y: 30,
        left: 20,
        top: 30,
        right: 120,
        bottom: 70,
        width: 100,
        height: 40,
        toJSON: () => ({}),
      });
    }
    const agentDom = createAgentDom();

    expect(agentDom.highlight('#first').ok).toBe(true);
    expect(agentDom.highlight('#second').ok).toBe(true);

    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-agent-dom-highlight-border]')).toHaveLength(1);
  });

  it('returns policy blocked when highlight target is denied', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const agentDom = createAgentDom({ denySelectors: ['#save'] });

    const result = agentDom.highlight('#save');

    expect(result).toMatchObject({ ok: false, code: 'POLICY_BLOCKED' });
  });
});
