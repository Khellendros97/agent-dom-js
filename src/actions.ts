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

    if (element instanceof HTMLSelectElement && typeof HTMLSelectElement.prototype.showPicker === 'function') {
      element.showPicker();
    } else {
      // Dispatch full mouse event chain for compatibility with custom component libraries
      const rect = element.getBoundingClientRect();
      const mouseOpts = { bubbles: true, clientX: rect.left + 1, clientY: rect.top + 1, button: 0 };
      element.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
      element.focus();
      element.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      element.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
      element.dispatchEvent(new MouseEvent('click', mouseOpts));
    }
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

    if (element instanceof HTMLSelectElement) {
      selectOption(element, value);
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

function selectOption(select: HTMLSelectElement, value: string): void {
  // Try matching by option value first
  for (const opt of Array.from(select.options)) {
    if (opt.value === value) {
      select.value = opt.value;
      return;
    }
  }
  // Fall back to matching by option text (case-insensitive)
  const lowerValue = value.toLowerCase();
  for (const opt of Array.from(select.options)) {
    if ((opt.textContent ?? '').trim().toLowerCase() === lowerValue) {
      select.value = opt.value;
      return;
    }
  }
  // Partial match
  for (const opt of Array.from(select.options)) {
    if ((opt.textContent ?? '').toLowerCase().includes(lowerValue)) {
      select.value = opt.value;
      return;
    }
  }
}
