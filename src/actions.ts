import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { ActionResult, AgentDomResult } from './types';
import type { FrameworkAdapter } from './frameworks/types';

function isElementDisabled(element: HTMLElement): boolean {
  if ('disabled' in element && (element as HTMLInputElement).disabled) return true;
  return element.getAttribute('aria-disabled') === 'true';
}

function normalizeClickTarget(
  element: HTMLElement,
  adapters: readonly FrameworkAdapter[],
): HTMLElement {
  // Adapter 链：按顺序调用，首个返回非 null 即为最终点击目标
  for (const adapter of adapters) {
    const result = adapter.normalizeClickTarget?.(element);
    if (result) return result;
  }
  // Generic fallback：如果元素是 role=combobox 内部的 input，重定向到 combobox 本身
  if (element instanceof HTMLInputElement && element.closest('[role="combobox"]')) {
    const wrapper = element.closest('[role="combobox"]');
    if (wrapper instanceof HTMLElement) return wrapper;
  }
  return element;
}

export async function clickElement(
  element: Element,
  target: string,
  adapters: readonly FrameworkAdapter[] = [],
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
    const clickTarget = normalizeClickTarget(element, adapters);
    clickTarget.scrollIntoView({ block: 'center', inline: 'center' });

    // Native select: use showPicker if available
    if (element instanceof HTMLSelectElement) {
      if (typeof HTMLSelectElement.prototype.showPicker === 'function') {
        try {
          element.showPicker();
          return success({ target });
        } catch (e) {
          if (e instanceof DOMException && e.name === 'NotAllowedError') {
            return failure('ACTION_FAILED', `showPicker needs user activation: ${target}`, e.message);
          }
        }
      }
    }

    // Pointer + mouse event chain (no duplicate click from automatic dblclick)
    const rect = clickTarget.getBoundingClientRect();
    const opts: PointerEventInit & MouseEventInit = {
      bubbles: true, cancelable: true, button: 0, buttons: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      pointerId: 1, pointerType: 'mouse',
    };
    clickTarget.dispatchEvent(newPointerEvent('pointerover', opts));
    clickTarget.dispatchEvent(newPointerEvent('pointerenter', opts));
    clickTarget.dispatchEvent(newPointerEvent('pointerdown', opts));
    clickTarget.dispatchEvent(newMouseEvent('mousedown', opts));
    clickTarget.focus();
    clickTarget.dispatchEvent(newPointerEvent('pointerup', opts));
    clickTarget.dispatchEvent(newMouseEvent('mouseup', opts));
    // Dispatch only one click — pointer click is preferred for component libraries
    clickTarget.dispatchEvent(newPointerEvent('click', opts));
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

function newPointerEvent(type: string, init: PointerEventInit): Event {
  try {
    return new PointerEvent(type, init);
  } catch {
    return new MouseEvent(type, init);
  }
}

function newMouseEvent(type: string, init: MouseEventInit): Event {
  try {
    return new MouseEvent(type, init);
  } catch {
    const event = document.createEvent('MouseEvent');
    event.initMouseEvent(type, init.bubbles ?? false, init.cancelable ?? false, document.defaultView!, 1,
      init.screenX ?? 0, init.screenY ?? 0, init.clientX ?? 0, init.clientY ?? 0,
      init.ctrlKey ?? false, init.altKey ?? false, init.shiftKey ?? false, init.metaKey ?? false,
      init.button ?? 0, null);
    return event;
  }
}
