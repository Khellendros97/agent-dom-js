import { failure, success } from './result';
import type { AgentDomResult } from './types';

interface InternalWaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export async function waitForCondition(
  condition: () => boolean,
  options: InternalWaitOptions = {},
): Promise<AgentDomResult<void>> {
  const timeoutMs = options.timeoutMs ?? 1000;
  const intervalMs = options.intervalMs ?? 50;
  const start = Date.now();

  return new Promise((resolve) => {
    const tick = () => {
      if (condition()) {
        resolve(success(undefined));
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        resolve(failure('TIMEOUT', `Timed out after ${timeoutMs}ms`));
        return;
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });
}
