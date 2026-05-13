import type { AgentDomOptions } from './types';

function safeMatch(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function safeClosest(element: Element, selector: string): Element | null {
  try {
    return element.closest(selector);
  } catch {
    return null;
  }
}

export function isAllowedByPolicy(element: Element, options: AgentDomOptions): boolean {
  if (options.denySelectors?.some((selector) => safeMatch(element, selector) || Boolean(safeClosest(element, selector)))) {
    return false;
  }

  if (options.allowSelectors?.length) {
    return options.allowSelectors.some((selector) => safeMatch(element, selector) || Boolean(safeClosest(element, selector)));
  }

  return true;
}
