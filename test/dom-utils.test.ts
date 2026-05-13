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
});
