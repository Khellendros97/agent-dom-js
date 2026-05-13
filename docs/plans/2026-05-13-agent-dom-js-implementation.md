# Agent DOM JS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-side JavaScript library that lets a host page call `snapshot()`, `click()`, `fill()`, and related DOM APIs for an embedded AI assistant.

**Architecture:** Implement a small TypeScript library with a facade (`createAgentDom`) over focused modules: snapshot generation, ref registry, target resolution, action execution, waits, and safety policy. Validate behavior through browser-oriented unit tests and the three test fixtures under `web-test/`.

**Tech Stack:** TypeScript, Vite library build, Vitest with browser-like DOM environment, static HTML/Vue3/React manual fixtures.

---

## Current Context

Design document: `docs/plans/2026-05-13-agent-dom-js-design.md`.

Existing test fixtures:

- `web-test/static-html/index.html`
- `web-test/vue3/package.json`
- `web-test/vue3/src/App.vue`
- `web-test/react/package.json`
- `web-test/react/src/main.jsx`

Reference project is ignored by Git and should remain untouched:

- `.reference/agent-browser/`

Implementation should focus on the MVP in the design document:

- `createAgentDom(options)`
- `snapshot()`
- `click(target)`
- `fill(target, value)`
- `focus(target)`
- `getText(target?)`
- `isVisible(target)`
- `waitFor(target, options)`
- Basic safety policy: `root`, `allowSelectors`, `denySelectors`, sensitive value masking

## Execution Rules

- Do not modify `.reference/`.
- Keep public API small and stable.
- Prefer browser-standard DOM APIs over framework-specific code.
- Return structured results instead of throwing user-facing errors.
- Add tests before implementation for each behavior.
- Commit only when explicitly requested by the user.

---

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/types.ts`
- Create: `test/setup.ts`

**Step 1: Create package metadata**

Create `package.json`:

```json
{
  "name": "agent-dom-js",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "dist/agent-dom-js.umd.cjs",
  "module": "dist/agent-dom-js.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vite-plugin-dts": "latest",
    "vitest": "latest"
  }
}
```

**Step 2: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationDir": "dist",
    "noEmit": true
  },
  "include": ["src", "test", "vite.config.ts", "vitest.config.ts"]
}
```

**Step 3: Create Vite config**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true })],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AgentDom',
      fileName: 'agent-dom-js',
      formats: ['es', 'umd'],
    },
  },
});
```

**Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
  },
});
```

**Step 5: Create initial public types**

Create `src/types.ts` with minimal exported types:

```ts
export type AgentDomResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AgentDomErrorCode; error: string; detail?: unknown };

export type AgentDomErrorCode =
  | 'ELEMENT_NOT_FOUND'
  | 'STALE_REF'
  | 'NOT_VISIBLE'
  | 'DISABLED'
  | 'UNSUPPORTED_ELEMENT'
  | 'POLICY_BLOCKED'
  | 'TIMEOUT'
  | 'ACTION_FAILED';

export interface AgentDomOptions {
  root?: ParentNode;
  allowSelectors?: string[];
  denySelectors?: string[];
  readOnly?: boolean;
  maskSensitiveValues?: boolean;
}

export interface SnapshotNode {
  ref?: string;
  role: string;
  name: string;
  tagName: string;
  value?: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface SnapshotResult {
  text: string;
  nodes: SnapshotNode[];
}

export interface ActionResult {
  target: string;
}

export interface WaitOptions {
  timeoutMs?: number;
  state?: 'attached' | 'visible';
  text?: string;
}

export interface AgentDom {
  snapshot(): AgentDomResult<SnapshotResult>;
  click(target: string): Promise<AgentDomResult<ActionResult>>;
  fill(target: string, value: string): Promise<AgentDomResult<ActionResult>>;
  focus(target: string): Promise<AgentDomResult<ActionResult>>;
  getText(target?: string): AgentDomResult<string>;
  isVisible(target: string): AgentDomResult<boolean>;
  waitFor(target: string, options?: WaitOptions): Promise<AgentDomResult<ActionResult>>;
}
```

**Step 6: Create placeholder entry**

Create `src/index.ts`:

```ts
export type * from './types';
```

Create `test/setup.ts`:

```ts
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    value: {},
    configurable: true,
  });
}

if (!globalThis.CSS.escape) {
  globalThis.CSS.escape = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
```

**Step 7: Install dependencies**

Run: `pnpm install`

Expected: dependencies install and `pnpm-lock.yaml` is created.

If `pnpm` is unavailable, ask the user before switching package managers.

**Step 8: Verify scaffold**

Run: `pnpm typecheck`

Expected: PASS.

Run: `pnpm build`

Expected: PASS and `dist/` generated.

---

### Task 2: Result Helpers

**Files:**

- Create: `src/result.ts`
- Create: `test/result.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/result.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { failure, success } from '../src/result';

describe('result helpers', () => {
  it('creates success results', () => {
    expect(success({ value: 1 })).toEqual({ ok: true, data: { value: 1 } });
  });

  it('creates failure results', () => {
    expect(failure('ELEMENT_NOT_FOUND', 'Missing')).toEqual({
      ok: false,
      code: 'ELEMENT_NOT_FOUND',
      error: 'Missing',
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/result.test.ts`

Expected: FAIL because `src/result.ts` does not exist.

**Step 3: Implement helpers**

Create `src/result.ts`:

```ts
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
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { failure, success } from './result';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/result.test.ts`

Expected: PASS.

---

### Task 3: Ref Registry

**Files:**

- Create: `src/ref-registry.ts`
- Create: `test/ref-registry.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/ref-registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';

describe('RefRegistry', () => {
  it('assigns refs and resolves supported ref formats', () => {
    const registry = new RefRegistry();
    const button = document.createElement('button');
    document.body.append(button);

    const ref = registry.register(button);

    expect(ref).toBe('e1');
    expect(registry.resolve('e1')).toBe(button);
    expect(registry.resolve('@e1')).toBe(button);
    expect(registry.resolve('ref=e1')).toBe(button);
  });

  it('returns null for stale refs', () => {
    const registry = new RefRegistry();
    const button = document.createElement('button');
    document.body.append(button);
    const ref = registry.register(button);
    button.remove();

    expect(registry.resolve(ref)).toBeNull();
  });

  it('clears refs and restarts numbering', () => {
    const registry = new RefRegistry();
    registry.register(document.createElement('button'));
    registry.clear();

    expect(registry.register(document.createElement('input'))).toBe('e1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/ref-registry.test.ts`

Expected: FAIL because `RefRegistry` does not exist.

**Step 3: Implement registry**

Create `src/ref-registry.ts`:

```ts
export class RefRegistry {
  private elements = new Map<string, Element>();
  private nextId = 1;

  clear(): void {
    this.elements.clear();
    this.nextId = 1;
  }

  register(element: Element): string {
    const ref = `e${this.nextId}`;
    this.nextId += 1;
    this.elements.set(ref, element);
    return ref;
  }

  resolve(target: string): Element | null {
    const ref = parseRef(target);
    if (!ref) {
      return null;
    }

    const element = this.elements.get(ref);
    if (!element || !element.isConnected) {
      return null;
    }

    return element;
  }
}

export function parseRef(target: string): string | null {
  const trimmed = target.trim();
  if (/^@e\d+$/.test(trimmed)) {
    return trimmed.slice(1);
  }
  if (/^ref=e\d+$/.test(trimmed)) {
    return trimmed.slice(4);
  }
  if (/^e\d+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/ref-registry.test.ts`

Expected: PASS.

---

### Task 4: DOM Utilities

**Files:**

- Create: `src/dom-utils.ts`
- Create: `test/dom-utils.test.ts`

**Step 1: Write failing tests**

Create `test/dom-utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from '../src/dom-utils';

describe('dom utils', () => {
  it('infers common roles', () => {
    expect(getRole(document.createElement('button'))).toBe('button');

    const link = document.createElement('a');
    link.href = '#target';
    expect(getRole(link)).toBe('link');

    const input = document.createElement('input');
    input.type = 'checkbox';
    expect(getRole(input)).toBe('checkbox');
  });

  it('uses aria-label and associated label as accessible names', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', '保存');
    expect(getAccessibleName(button)).toBe('保存');

    document.body.innerHTML = '<label for="email">邮箱</label><input id="email" />';
    expect(getAccessibleName(document.getElementById('email')!)).toBe('邮箱');
  });

  it('detects hidden and sensitive elements', () => {
    const hidden = document.createElement('button');
    hidden.hidden = true;
    expect(isElementVisible(hidden)).toBe(false);

    const password = document.createElement('input');
    password.type = 'password';
    expect(isSensitiveElement(password)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/dom-utils.test.ts`

Expected: FAIL because `src/dom-utils.ts` does not exist.

**Step 3: Implement utilities**

Create `src/dom-utils.ts` with these exported functions:

```ts
export function getRole(element: Element): string {
  const explicit = element.getAttribute('role');
  if (explicit) {
    return explicit;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && (element as HTMLAnchorElement).href) return 'link';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'summary') return 'button';

  if (tag === 'input') {
    const type = ((element as HTMLInputElement).type || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
    return 'textbox';
  }

  if ((element as HTMLElement).isContentEditable) return 'textbox';
  return tag;
}

export function getAccessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  if (element.id) {
    const label = element.ownerDocument.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  const wrappingLabel = element.closest('label');
  if (wrappingLabel?.textContent?.trim()) return wrappingLabel.textContent.trim();

  const placeholder = (element as HTMLInputElement).placeholder?.trim();
  if (placeholder) return placeholder;

  const value = (element as HTMLInputElement).value?.trim();
  if (value && ['button', 'submit', 'reset'].includes((element as HTMLInputElement).type)) return value;

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  return true;
}

export function isSensitiveElement(element: Element): boolean {
  if (!(element instanceof HTMLInputElement)) return false;
  const type = element.type.toLowerCase();
  const name = `${element.name} ${element.id} ${element.autocomplete}`.toLowerCase();
  return type === 'password' || /token|secret|otp|code|captcha/.test(name);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/dom-utils.test.ts`

Expected: PASS.

---

### Task 5: Snapshot Engine

**Files:**

- Create: `src/snapshot.ts`
- Create: `test/snapshot.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/snapshot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';
import { createSnapshot } from '../src/snapshot';

describe('createSnapshot', () => {
  it('renders interactive elements with refs', () => {
    document.body.innerHTML = `
      <main>
        <h1>测试页面</h1>
        <button>提交</button>
        <label for="name">姓名</label><input id="name" value="张三" />
      </main>
    `;
    const registry = new RefRegistry();

    const snapshot = createSnapshot(document, registry, { maskSensitiveValues: true });

    expect(snapshot.text).toContain('- heading "测试页面"');
    expect(snapshot.text).toContain('- button "提交" [ref=e1]');
    expect(snapshot.text).toContain('- textbox "姓名" [ref=e2, value="张三"]');
    expect(snapshot.nodes).toHaveLength(2);
  });

  it('masks sensitive input values', () => {
    document.body.innerHTML = '<label for="password">密码</label><input id="password" type="password" value="secret" />';
    const snapshot = createSnapshot(document, new RefRegistry(), { maskSensitiveValues: true });

    expect(snapshot.text).toContain('value="[masked]"');
    expect(snapshot.text).not.toContain('secret');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/snapshot.test.ts`

Expected: FAIL because `createSnapshot` does not exist.

**Step 3: Implement snapshot engine**

Create `src/snapshot.ts`:

```ts
import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from './dom-utils';
import type { RefRegistry } from './ref-registry';
import type { AgentDomOptions, SnapshotNode, SnapshotResult } from './types';

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  'summary',
  '[role]',
  '[tabindex]',
  '[contenteditable="true"]',
].join(',');

export function createSnapshot(
  root: ParentNode,
  registry: RefRegistry,
  options: Pick<AgentDomOptions, 'maskSensitiveValues'> = {},
): SnapshotResult {
  registry.clear();

  const lines: string[] = [];
  const nodes: SnapshotNode[] = [];
  const scope = root instanceof Document ? root.body : root;

  collectHeadings(scope, lines);

  scope.querySelectorAll(INTERACTIVE_SELECTOR).forEach((element) => {
    if (!isElementVisible(element)) return;

    const ref = registry.register(element);
    const node = describeElement(element, ref, options.maskSensitiveValues ?? true);
    nodes.push(node);
    lines.push(renderNode(node));
  });

  return { text: lines.join('\n'), nodes };
}

function collectHeadings(root: ParentNode, lines: string[]): void {
  root.querySelectorAll('h1,h2,h3').forEach((heading) => {
    if (!isElementVisible(heading)) return;
    const name = heading.textContent?.replace(/\s+/g, ' ').trim();
    if (name) lines.push(`- heading "${escapeText(name)}"`);
  });
}

function describeElement(element: Element, ref: string, maskSensitiveValues: boolean): SnapshotNode {
  const role = getRole(element);
  const name = getAccessibleName(element);
  const node: SnapshotNode = {
    ref,
    role,
    name,
    tagName: element.tagName.toLowerCase(),
  };

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    node.value = maskSensitiveValues && isSensitiveElement(element) ? '[masked]' : element.value;
    node.disabled = element.disabled;
  }

  if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
    node.checked = element.checked;
  }

  if (element instanceof HTMLSelectElement) {
    node.value = element.value;
    node.disabled = element.disabled;
  }

  return node;
}

function renderNode(node: SnapshotNode): string {
  const attrs = [`ref=${node.ref}`];
  if (node.value) attrs.push(`value="${escapeText(node.value)}"`);
  if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
  if (node.disabled) attrs.push('disabled=true');

  return `- ${node.role} "${escapeText(node.name)}" [${attrs.join(', ')}]`;
}

function escapeText(value: string): string {
  return value.replace(/"/g, '\\"');
}
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
export { createSnapshot } from './snapshot';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/snapshot.test.ts`

Expected: PASS.

---

### Task 6: Target Resolution And Policy

**Files:**

- Create: `src/policy.ts`
- Create: `src/target.ts`
- Create: `test/target.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/target.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';
import { resolveTarget } from '../src/target';

describe('resolveTarget', () => {
  it('resolves refs before selectors', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const registry = new RefRegistry();
    const button = document.getElementById('save')!;
    registry.register(button);

    const result = resolveTarget('@e1', document, registry, {});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(button);
  });

  it('resolves css selectors', () => {
    document.body.innerHTML = '<button class="save">保存</button>';
    const result = resolveTarget('.save', document, new RefRegistry(), {});

    expect(result.ok).toBe(true);
  });

  it('blocks denied selectors', () => {
    document.body.innerHTML = '<button class="danger">删除</button>';
    const result = resolveTarget('.danger', document, new RefRegistry(), { denySelectors: ['.danger'] });

    expect(result).toMatchObject({ ok: false, code: 'POLICY_BLOCKED' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/target.test.ts`

Expected: FAIL because target and policy modules do not exist.

**Step 3: Implement policy**

Create `src/policy.ts`:

```ts
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
```

**Step 4: Implement target resolution**

Create `src/target.ts`:

```ts
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
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
export { createSnapshot } from './snapshot';
export { isAllowedByPolicy } from './policy';
export { resolveTarget } from './target';
```

**Step 5: Run test to verify it passes**

Run: `pnpm test test/target.test.ts`

Expected: PASS.

---

### Task 7: Action Engine

**Files:**

- Create: `src/actions.ts`
- Create: `test/actions.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/actions.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { clickElement, fillElement, focusElement } from '../src/actions';

describe('actions', () => {
  it('clicks buttons', async () => {
    const button = document.createElement('button');
    const listener = vi.fn();
    button.addEventListener('click', listener);
    document.body.append(button);

    const result = await clickElement(button, 'button');

    expect(result).toEqual({ ok: true, data: { target: 'button' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('fills inputs and dispatches input/change events', async () => {
    const input = document.createElement('input');
    const inputListener = vi.fn();
    const changeListener = vi.fn();
    input.addEventListener('input', inputListener);
    input.addEventListener('change', changeListener);
    document.body.append(input);

    const result = await fillElement(input, 'hello', 'input');

    expect(result.ok).toBe(true);
    expect(input.value).toBe('hello');
    expect(inputListener).toHaveBeenCalledTimes(1);
    expect(changeListener).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported fill targets', async () => {
    const div = document.createElement('div');
    const result = await fillElement(div, 'hello', 'div');

    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_ELEMENT' });
  });

  it('focuses focusable elements', async () => {
    const input = document.createElement('input');
    document.body.append(input);

    const result = await focusElement(input, 'input');

    expect(result.ok).toBe(true);
    expect(document.activeElement).toBe(input);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/actions.test.ts`

Expected: FAIL because `src/actions.ts` does not exist.

**Step 3: Implement actions**

Create `src/actions.ts`:

```ts
import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { ActionResult, AgentDomResult } from './types';

export async function clickElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', `Target is not visible: ${target}`);
  }

  element.scrollIntoView({ block: 'center', inline: 'center' });
  element.focus();
  element.click();
  return success({ target });
}

export async function focusElement(element: Element, target: string): Promise<AgentDomResult<ActionResult>> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', `Target is not an HTMLElement: ${target}`);
  }
  element.focus();
  return success({ target });
}

export async function fillElement(
  element: Element,
  value: string,
  target: string,
): Promise<AgentDomResult<ActionResult>> {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return success({ target });
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    return success({ target });
  }

  return failure('UNSUPPORTED_ELEMENT', `Target cannot be filled: ${target}`);
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
}
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { clickElement, fillElement, focusElement } from './actions';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
export { createSnapshot } from './snapshot';
export { isAllowedByPolicy } from './policy';
export { resolveTarget } from './target';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/actions.test.ts`

Expected: PASS.

---

### Task 8: Wait Engine

**Files:**

- Create: `src/wait.ts`
- Create: `test/wait.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/wait.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { waitForCondition } from '../src/wait';

describe('waitForCondition', () => {
  it('resolves when condition becomes true', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 10);

    const result = await waitForCondition(() => ready, { timeoutMs: 200 });

    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('times out', async () => {
    const result = await waitForCondition(() => false, { timeoutMs: 10, intervalMs: 5 });

    expect(result).toMatchObject({ ok: false, code: 'TIMEOUT' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/wait.test.ts`

Expected: FAIL because `src/wait.ts` does not exist.

**Step 3: Implement wait helper**

Create `src/wait.ts`:

```ts
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
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { clickElement, fillElement, focusElement } from './actions';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
export { createSnapshot } from './snapshot';
export { isAllowedByPolicy } from './policy';
export { resolveTarget } from './target';
export { waitForCondition } from './wait';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/wait.test.ts`

Expected: PASS.

---

### Task 9: AgentDom Facade

**Files:**

- Create: `src/agent-dom.ts`
- Create: `test/agent-dom.test.ts`
- Modify: `src/index.ts`

**Step 1: Write failing tests**

Create `test/agent-dom.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createAgentDom } from '../src/agent-dom';

describe('createAgentDom', () => {
  it('snapshots then clicks by ref', async () => {
    document.body.innerHTML = '<button>保存</button><p role="status"></p>';
    document.querySelector('button')!.addEventListener('click', () => {
      document.querySelector('[role="status"]')!.textContent = '已保存';
    });

    const agentDom = createAgentDom();
    const snapshot = agentDom.snapshot();
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error(snapshot.error);

    expect(snapshot.data.text).toContain('[ref=e1]');
    const click = await agentDom.click('@e1');

    expect(click.ok).toBe(true);
    expect(document.querySelector('[role="status"]')!.textContent).toBe('已保存');
  });

  it('fills by selector and reads text', async () => {
    document.body.innerHTML = '<label for="name">姓名</label><input id="name" /><div id="output">Hello</div>';
    const agentDom = createAgentDom();

    const fill = await agentDom.fill('#name', '张三');

    expect(fill.ok).toBe(true);
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('张三');
    expect(agentDom.getText('#output')).toEqual({ ok: true, data: 'Hello' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test test/agent-dom.test.ts`

Expected: FAIL because `createAgentDom` does not exist.

**Step 3: Implement facade**

Create `src/agent-dom.ts`:

```ts
import { clickElement, fillElement, focusElement } from './actions';
import { isElementVisible } from './dom-utils';
import { RefRegistry } from './ref-registry';
import { failure, success } from './result';
import { createSnapshot } from './snapshot';
import { resolveTarget } from './target';
import type { ActionResult, AgentDom, AgentDomOptions, AgentDomResult, SnapshotResult, WaitOptions } from './types';
import { waitForCondition } from './wait';

export function createAgentDom(options: AgentDomOptions = {}): AgentDom {
  const root = options.root ?? document;
  const registry = new RefRegistry();

  function resolve(target: string): AgentDomResult<Element> {
    return resolveTarget(target, root, registry, options);
  }

  return {
    snapshot(): AgentDomResult<SnapshotResult> {
      return success(createSnapshot(root, registry, { maskSensitiveValues: options.maskSensitiveValues ?? true }));
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
      const result = await waitForCondition(() => {
        const resolved = resolve(target);
        if (!resolved.ok) return false;
        if (waitOptions.text) return (resolved.data.textContent ?? '').includes(waitOptions.text);
        if (waitOptions.state === 'visible') return isElementVisible(resolved.data);
        return true;
      }, { timeoutMs: waitOptions.timeoutMs });

      return result.ok ? success({ target }) : result;
    },
  };
}
```

Modify `src/index.ts`:

```ts
export type * from './types';
export { clickElement, fillElement, focusElement } from './actions';
export { createAgentDom } from './agent-dom';
export { failure, success } from './result';
export { parseRef, RefRegistry } from './ref-registry';
export { createSnapshot } from './snapshot';
export { isAllowedByPolicy } from './policy';
export { resolveTarget } from './target';
export { waitForCondition } from './wait';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test test/agent-dom.test.ts`

Expected: PASS.

---

### Task 10: Fixture Smoke Tests

**Files:**

- Create: `test/fixtures.test.ts`
- Modify: `web-test/README.md`

**Step 1: Write static fixture smoke test**

Create `test/fixtures.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAgentDom } from '../src/agent-dom';

describe('web-test fixtures', () => {
  it('can snapshot and fill the static HTML fixture', async () => {
    const html = readFileSync(resolve('web-test/static-html/index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    const agentDom = createAgentDom();
    const snapshot = agentDom.snapshot();

    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error(snapshot.error);
    expect(snapshot.data.text).toContain('提交资料');

    const fill = await agentDom.fill('#name', '测试用户');

    expect(fill.ok).toBe(true);
    expect((document.getElementById('name') as HTMLInputElement).value).toBe('测试用户');
  });
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm test test/fixtures.test.ts`

Expected: PASS.

**Step 3: Document manual fixture commands**

Modify `web-test/README.md` to include this section:

````md
## Manual Run

Static HTML:

Open `web-test/static-html/index.html` directly in a browser.

Vue 3:

```bash
cd web-test/vue3
pnpm install
pnpm dev
```

React:

```bash
cd web-test/react
pnpm install
pnpm dev
```
````

**Step 4: Run all tests**

Run: `pnpm test`

Expected: PASS.

---

### Task 11: Documentation And Final Verification

**Files:**

- Create: `README.md`
- Modify: `docs/plans/2026-05-13-agent-dom-js-design.md` only if implementation decisions changed

**Step 1: Create usage README**

Create `README.md`:

```md
# agent-dom-js

Browser-side DOM operation library for embedded AI assistants.

## Basic Usage

```ts
import { createAgentDom } from 'agent-dom-js';

const agentDom = createAgentDom();

const snapshot = agentDom.snapshot();
await agentDom.click('@e1');
await agentDom.fill('#email', 'user@example.com');
```

## Scope

This library operates only on the current page DOM that the host page can access. It does not control other websites, browser tabs, network traffic, screenshots, PDFs, or cross-origin iframes.
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS.

**Step 3: Run tests**

Run: `pnpm test`

Expected: PASS.

**Step 4: Run build**

Run: `pnpm build`

Expected: PASS.

**Step 5: Inspect Git status**

Run: `git status --short`

Expected: source, tests, docs, lockfile, and fixture files appear as uncommitted changes. `.reference/` must not appear.

---

## Review Step

After implementation and verification, request code review through `@oracle` because this is a new public API and browser automation surface.

Review input should include:

- `docs/plans/2026-05-13-agent-dom-js-design.md`
- `docs/plans/2026-05-13-agent-dom-js-implementation.md`
- Public API files under `src/`
- Test files under `test/`
- Verification command results

Expected review focus:

- Public API clarity
- Security and policy defaults
- Framework compatibility risks
- Snapshot usefulness for AI agents
- Overengineering or missing MVP behavior
