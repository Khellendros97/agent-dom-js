import type { AgentDomErrorCode, AgentDomResult } from './types';

export function success<T>(data: T): AgentDomResult<T> {
  return { ok: true, data };
}

export function failure<T = never>(
  code: AgentDomErrorCode,
  error: string,
  detail?: unknown,
): AgentDomResult<T> {
  return detail === undefined
    ? { ok: false, code, error }
    : { ok: false, code, error, detail };
}
