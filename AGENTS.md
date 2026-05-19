# AGENTS.md

Browser-side DOM operation library (`agent-dom-js`) — lets embedded AI assistants observe and interact with host page DOM via command-style API.

## Commands

```bash
pnpm test          # vitest run (jsdom, 30 tests)
pnpm test:watch    # vitest watch mode
pnpm typecheck     # tsc --noEmit
pnpm build         # vite build → dist/ (ES + UMD)
```

No lint, format, or CI config exists.

## Architecture

```
src/
  index.ts        → public API: createAgentDom, types, success/failure
  agent-dom.ts    → factory, wires everything together
  snapshot.ts     → DOM snapshot → text + node list
  actions.ts      → clickElement, fillElement, focusElement
  target.ts       → resolveTarget (ref or CSS selector → Element)
  ref-registry.ts → RefRegistry class (e1, e2, e16-1 style refs)
  policy.ts       → allowSelectors / denySelectors filtering
  dom-utils.ts    → getRole, getAccessibleName, isElementVisible, isSensitiveElement
  wait.ts         → polling waitForCondition
  result.ts       → success() / failure() helpers
  types.ts        → all public types
```

**Entry point:** `src/index.ts` → UMD global `AgentDom`, ES module `agent-dom-js.js`.

**Return pattern:** Every API method returns `AgentDomResult<T>` — always check `.ok` before accessing `.data`:
```ts
{ ok: true; data: T } | { ok: false; code: AgentDomErrorCode; error: string; detail?: unknown }
```

## Testing

- **Environment:** `jsdom` (configured in `vitest.config.ts`)
- **Setup:** `test/setup.ts` polyfills `scrollIntoView`, `CSS` global, `CSS.escape` — required for jsdom
- **Test files:** mirror `src/` structure (`test/actions.test.ts` ↔ `src/actions.ts`, etc.)
- `web-test/` contains fixture apps (React, Vue 3, Ant Design, static HTML) for manual browser testing — not automated tests

## Key quirks

- **Ant Design coupling:** `snapshot.ts` and `actions.ts` contain Ant-Design-specific logic (`.ant-select`, `.ant-select-dropdown`, `.ant-select-item-option`). When changing snapshot or action behavior, verify AntD combobox/dropdown workflows still work.
- **Ref system:** `snapshot()` clears registry and re-registers elements. Refs are only valid until next `snapshot()` call. A stale ref returns `STALE_REF` (element isConnected check).
- **Visibility check:** `isElementVisible` uses `element.checkVisibility()` in real browsers but falls back to `getComputedStyle` in jsdom. Elements with explicit `role` attribute skip opacity check (allows transparent but functional antd inputs).
- **Sensitive values:** `maskSensitiveValues: true` (default) hides password/token/secret/otp/code/captcha field values in snapshots.
- **Package is ESM-first:** `"type": "module"` in package.json. Test files and config use `.ts` extension.
