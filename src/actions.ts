import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { ActionResult, AgentDomResult } from './types';

export async function clickElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', `Target is not visible: ${target}`);
  }

  element.scrollIntoView({ block: 'center', inline: 'center' });
  element.focus();
  element.click();
  return success({ target });
}

export async function focusElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  element.focus();
  return success({ target });
}

export async function fillElement(
  element: Element,
  value: string,
  target: string,
): Promise<AgentDomResult<ActionResult>> {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return success({ target });
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    return success({ target });
  }

  return failure('UNSUPPORTED_ELEMENT', `Target cannot be filled: ${target}`);
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
}
