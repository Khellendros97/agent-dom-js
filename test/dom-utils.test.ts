import { describe, expect, it } from 'vitest';
import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from '../src/dom-utils';

describe('dom utils', () => {
  it('infers common roles', () => {
    expect(getRole(document.createElement('button'))).toBe('button');

    const link = document.createElement('a');
    link.href = '#target';
    expect(getRole(link)).toBe('link');

    const input = document.createElement('input');
    input.type = 'checkbox';
    expect(getRole(input)).toBe('checkbox');
  });

  it('uses aria-label and associated label as accessible names', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', '保存');
    expect(getAccessibleName(button)).toBe('保存');

    document.body.innerHTML = '<label for="email">邮箱</label><input id="email" />';
    expect(getAccessibleName(document.getElementById('email')!)).toBe('邮箱');
  });

  it('detects hidden and sensitive elements', () => {
    const hidden = document.createElement('button');
    hidden.hidden = true;
    expect(isElementVisible(hidden)).toBe(false);

    const password = document.createElement('input');
    password.type = 'password';
    expect(isSensitiveElement(password)).toBe(true);
  });

  it('excludes nested ul/ol text from <li> accessible name', () => {
    document.body.innerHTML = `
      <li id="root" tabindex="0">
        <a>/(ID:1)</a>
        <ul>
          <li tabindex="0"><a>用户组A(ID:2)</a></li>
          <li tabindex="0"><a>用户组B(ID:3)</a></li>
        </ul>
      </li>
    `;
    const li = document.getElementById('root')!;
    const name = getAccessibleName(li);

    // 不应包含后代 <li> 的文本
    expect(name).not.toContain('用户组A');
    expect(name).not.toContain('用户组B');
    // 应包含自身直接子元素文本
    expect(name).toContain('/(ID:1)');
  });

  it('<li> without nested lists returns full text normally', () => {
    document.body.innerHTML = '<li tabindex="0">普通列表项</li>';
    const li = document.querySelector('li')!;
    const name = getAccessibleName(li);

    expect(name).toBe('普通列表项');
  });
});
