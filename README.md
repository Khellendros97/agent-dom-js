# agent-dom-js

Browser-side DOM operation library for embedded AI assistants.

## Overview

`agent-dom-js` is a lightweight TypeScript library that lets an embedded AI assistant observe and interact with the host page's DOM. It provides a command-style API: take a semantic snapshot, then click, fill, focus, or wait for elements by reference.

Inspired by [agent-browser](https://github.com/vercel-labs/agent-browser), but implemented entirely in the browser without CDP, daemons, or native processes.

## Install

```bash
pnpm add agent-dom-js
# or
npm install agent-dom-js
```

## Quick Start

```ts
import { createAgentDom } from 'agent-dom-js';

const agentDom = createAgentDom();

// 1. Take a semantic snapshot
const snap = agentDom.snapshot();
console.log(snap.data.text);
// - heading "用户资料"
// - button "提交" [ref=e1]
// - textbox "邮箱" [ref=e2, type=email, placeholder="user@example.com"]
// ...

// 2. Act on elements by ref or CSS selector
await agentDom.click('@e1');              // click by ref
await agentDom.fill('#email', 'a@b.com'); // fill by selector
await agentDom.focus('@e3');
console.log(agentDom.getText('#output')); // read text
```

## API

| Method | Signature |
|--------|-----------|
| `snapshot(options?)` | `AgentDomResult<SnapshotResult>` |
| `click(target)` | `Promise<AgentDomResult<ActionResult>>` |
| `fill(target, value)` | `Promise<AgentDomResult<ActionResult>>` |
| `focus(target)` | `Promise<AgentDomResult<ActionResult>>` |
| `getText(target?)` | `AgentDomResult<string>` |
| `isVisible(target)` | `AgentDomResult<boolean>` |
| `waitFor(target, options?)` | `Promise<AgentDomResult<ActionResult>>` |

`target` accepts:
- Ref: `@e1`, `e1`, `ref=e1`
- CSS selector: `#email`, `.submit-btn`, `button[type="submit"]`
- Hierarchical ref: `@e16-1` (for dropdown options)

All methods return `AgentDomResult<T>`:
```ts
type AgentDomResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AgentDomErrorCode; error: string; detail?: unknown };
```

## Configuration

```ts
const agentDom = createAgentDom({
  root?: ParentNode;              // scope (default: document)
  allowSelectors?: string[];      // allowlist
  denySelectors?: string[];       // blocklist — excluded from snapshot and actions
  readOnly?: boolean;             // forbid click/fill/focus
  maskSensitiveValues?: boolean;  // hide password/token values (default: true)
});

// Scope snapshot to modal content when a modal is open
const scope = document.querySelector('.ant-modal-wrap');
const snap = agentDom.snapshot(scope ? { scope } : undefined);
```

## Snapshot Output

The `snapshot()` text is designed for AI consumption:

```
- heading "用户管理"
- combobox "筛选状态" [ref=e16, type=search, value="待审核"] # click to get options
  option "启用" [ref=e16-1]
  option "停用" [ref=e16-2]
  option "待审核" [ref=e16-3]
- button "添加用户" [ref=e17]
- table [3 rows]
  | 姓名 | 邮箱 | 角色 | 状态 |
  | 孙八 | sunba@example.com | 管理员 | 启用 |
  | 周九 | zhoujiu@example.com | 编辑 | 停用 |
  | 吴十 | wushi@example.com | 访客 | 待审核 |
- button "编辑" [ref=e18]
- button "删除" [ref=e19]
```

- Headings, tables, lists are read-only context without refs.
- Interactive elements get refs and attribute annotations.
- Ant Design Select options render inline as hierarchical refs.
- Password fields show `value="[masked]"`.
- Form validation errors are captured via `validation="..."`.

## Component Library Support

| Library | Snapshot | Click | Fill |
|---------|----------|-------|------|
| Native HTML | full | full | full |
| React (controlled) | full | full | full (native setter + events) |
| Vue 3 (v-model) | full | full | full |
| Ant Design | full (*) | full | select via click pipeline |

(*) Ant Design Select: options visible only while dropdown is open. Workflow: `click @combobox` → refresh snapshot → `click @option` to select.

## Scope

This library operates only on the current page DOM that the host page can access. It does **not**:
- Control other websites, browser tabs, or windows
- Access CDP, DevTools, or browser extensions
- Capture screenshots or PDFs
- Intercept network traffic
- Control cross-origin iframes

## Development

```bash
pnpm install
pnpm test        # 30 tests
pnpm typecheck
pnpm build
```

Test fixtures under `web-test/`:
| Port | Framework | Path |
|------|-----------|------|
| 3050 | Static HTML | `/web-test/static-html/index.html` |
| 3050 | Admin page | `/web-test/static-html/admin.html` |
| 5180 | React | `/` |
| 5190 | Vue 3 | `/` |
| 5200 | Ant Design | `/` |

Start a fixture dev server:
```bash
node serve-static.mjs &              # port 3050
cd web-test/react && pnpm dev --port 5180
cd web-test/vue3 && pnpm dev --port 5190
cd web-test/antd && pnpm dev --port 5200
```

## License

MIT
