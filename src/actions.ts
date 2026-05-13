import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { ActionResult, AgentDomResult } from './types';

function isElementDisabled(element: HTMLElement): boolean {
  if ('disabled' in element && (element as HTMLInputElement).disabled) return true;
  return element.getAttribute('aria-disabled') === 'true';
}

export async function clickElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', `Target is not visible: ${target}`);
  }
  if (isElementDisabled(element)) {
    return failure('DISABLED', `Target is disabled: ${target}`);
  }
  try {
    element.scrollIntoView({ block: 'center', inline: 'center' });
    element.focus();
    element.click();
  } catch (error) {
    return failure('ACTION_FAILED', `Click failed on: ${target}`, error);
  }
  return success({ target });
}

export async function focusElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', `Target is not visible: ${target}`);
  }
  if (isElementDisabled(element)) {
    return failure('DISABLED', `Target is disabled: ${target}`);
  }
  try {
    element.focus();
  } catch (error) {
    return failure('ACTION_FAILED', `Focus failed on: ${target}`, error);
  }
  return success({ target });
}

export async function fillElement(
  element: Element,
  value: string,
  target: string,
): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', `Target is not visible: ${target}`);
  }
  if (isElementDisabled(element)) {
    return failure('DISABLED', `Target is disabled: ${target}`);
  }

  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      setNativeValue(element, value);
      element.dispatchEvent(newEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return success({ target });
    }

    if (element.isContentEditable) {
      element.textContent = value;
      element.dispatchEvent(newEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      return success({ target });
    }

    return failure('UNSUPPORTED_ELEMENT', `Target cannot be filled: ${target}`);
  } catch (error) {
    return failure('ACTION_FAILED', `Fill failed on: ${target}`, error);
  }
}

function newEvent(type: string, init: InputEventInit): Event {
  try {
    return new InputEvent(type, init);
  } catch {
    const event = new Event(type, { bubbles: init.bubbles }) as Event & { inputType?: string; data?: string };
    Object.defineProperties(event, {
      inputType: { value: init.inputType },
      data: { value: init.data },
    });
    return event;
  }
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
}
