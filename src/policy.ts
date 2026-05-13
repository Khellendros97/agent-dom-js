import type { AgentDomOptions } from './types';

export function isAllowedByPolicy(element: Element, options: AgentDomOptions): boolean {
  if (options.denySelectors?.some((selector) => element.matches(selector) || Boolean(element.closest(selector)))) {
    return false;
  }

  if (options.allowSelectors?.length) {
    return options.allowSelectors.some((selector) => element.matches(selector) || Boolean(element.closest(selector)));
  }

  return true;
}
