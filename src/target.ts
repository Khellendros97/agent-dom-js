import { isAllowedByPolicy } from './policy';
import type { RefRegistry } from './ref-registry';
import { parseRef } from './ref-registry';
import { failure, success } from './result';
import type { AgentDomOptions, AgentDomResult } from './types';

export function resolveTarget(
  target: string,
  root: ParentNode,
  registry: RefRegistry,
  options: AgentDomOptions,
): AgentDomResult<Element> {
  const ref = parseRef(target);
  const element = ref ? registry.resolve(target) : querySelector(root, target);

  if (!element) {
    return failure(ref ? 'STALE_REF' : 'ELEMENT_NOT_FOUND', `Target not found: ${target}`);
  }

  if (!isAllowedByPolicy(element, options)) {
    return failure('POLICY_BLOCKED', `Target blocked by policy: ${target}`);
  }

  return success(element);
}

function querySelector(root: ParentNode, selector: string): Element | null {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}
