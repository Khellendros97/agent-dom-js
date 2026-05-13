import { clickElement, fillElement, focusElement } from './actions';
import { isElementVisible } from './dom-utils';
import { RefRegistry } from './ref-registry';
import { failure, success } from './result';
import { createSnapshot } from './snapshot';
import { resolveTarget } from './target';
import type { ActionResult, AgentDom, AgentDomOptions, AgentDomResult, SnapshotOptions, SnapshotResult, WaitOptions } from './types';
import { waitForCondition } from './wait';

export function createAgentDom(options: AgentDomOptions = {}): AgentDom {
  const root = options.root ?? document;
  const registry = new RefRegistry();

  function resolve(target: string): AgentDomResult<Element> {
    return resolveTarget(target, root, registry, options);
  }

  return {
    snapshot(snapOptions?: SnapshotOptions): AgentDomResult<SnapshotResult> {
      return success(createSnapshot(snapOptions?.scope ?? root, registry, {
        maskSensitiveValues: options.maskSensitiveValues ?? true,
        allowSelectors: options.allowSelectors,
        denySelectors: options.denySelectors,
      }));
    },

    async click(target: string): Promise<AgentDomResult<ActionResult>> {
      if (options.readOnly) return failure('POLICY_BLOCKED', 'AgentDom is read-only');
      const resolved = resolve(target);
      return resolved.ok ? clickElement(resolved.data, target) : resolved;
    },

    async fill(target: string, value: string): Promise<AgentDomResult<ActionResult>> {
      if (options.readOnly) return failure('POLICY_BLOCKED', 'AgentDom is read-only');
      const resolved = resolve(target);
      return resolved.ok ? fillElement(resolved.data, value, target) : resolved;
    },

    async focus(target: string): Promise<AgentDomResult<ActionResult>> {
      if (options.readOnly) return failure('POLICY_BLOCKED', 'AgentDom is read-only');
      const resolved = resolve(target);
      return resolved.ok ? focusElement(resolved.data, target) : resolved;
    },

    getText(target?: string): AgentDomResult<string> {
      if (!target) {
        return success((root instanceof Document ? root.body : root).textContent?.trim() ?? '');
      }
      const resolved = resolve(target);
      return resolved.ok ? success(resolved.data.textContent?.trim() ?? '') : resolved;
    },

    isVisible(target: string): AgentDomResult<boolean> {
      const resolved = resolve(target);
      return resolved.ok ? success(isElementVisible(resolved.data)) : resolved;
    },

    async waitFor(target: string, waitOptions: WaitOptions = {}): Promise<AgentDomResult<ActionResult>> {
      let permanentError: AgentDomResult<ActionResult> | null = null;

      const result = await waitForCondition(() => {
        const resolved = resolve(target);
        if (!resolved.ok) {
          // Deterministic errors: bail out immediately instead of timing out
          if (resolved.code === 'POLICY_BLOCKED' || resolved.code === 'STALE_REF') {
            permanentError = resolved;
            return true; // signal to exit early via error path
          }
          return false;
        }
        if (waitOptions.text) return (resolved.data.textContent ?? '').includes(waitOptions.text);
        if (waitOptions.state === 'visible') return isElementVisible(resolved.data);
        return true;
      }, { timeoutMs: waitOptions.timeoutMs });

      if (permanentError) return permanentError;
      return result.ok ? success({ target }) : result;
    },
  };
}
