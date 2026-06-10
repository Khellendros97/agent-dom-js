# Highlight Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `AgentDom.highlight(target, options?)` to visually highlight one target element with an RGB animated border and four surrounding mask layers.

**Architecture:** Keep public API wiring in `src/agent-dom.ts` and type declarations in `src/types.ts`. Put DOM overlay lifecycle in a focused `src/highlight.ts` module that returns an idempotent cleanup handle. Use four fixed mask blocks around the target rectangle so the target remains visible and clickable.

**Tech Stack:** TypeScript, browser DOM APIs, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-06-10-highlight-feature-design.md`

**Commit Policy:** Do not commit during execution unless the user explicitly authorizes it.

---

## File Structure

- Create `src/highlight.ts`: validates target, scrolls into view, creates four mask nodes, creates animated border, binds cleanup events, returns cleanup handle.
- Modify `src/types.ts`: add `HighlightOptions`; extend `AgentDom` with `highlight(target, options?)`.
- Modify `src/agent-dom.ts`: import `highlightElement`; maintain one active cleanup per `AgentDom` instance; expose `highlight` without readOnly blocking.
- Create `test/highlight.test.ts`: unit-test overlay behavior and error branches.
- Modify `test/agent-dom.test.ts`: test public instance API, readOnly allowance, and policy failure.

---

### Task 1: Add Failing Highlight Unit Tests

**Files:**
- Create: `test/highlight.test.ts`
- Test command: `pnpm test test/highlight.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/highlight.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { highlightElement } from '../src/highlight';

function appendVisibleButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = '保存';
  document.body.append(button);
  button.getBoundingClientRect = () => ({
    x: 20,
    y: 30,
    left: 20,
    top: 30,
    right: 120,
    bottom: 70,
    width: 100,
    height: 40,
    toJSON: () => ({}),
  });
  return button;
}

function masks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-agent-dom-highlight-mask]'));
}

function border(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-agent-dom-highlight-border]');
}

describe('highlightElement', () => {
  it('creates four mask layers and an animated border with default z-index', () => {
    const button = appendVisibleButton();

    const result = highlightElement(button);

    expect(result.ok).toBe(true);
    expect(masks()).toHaveLength(4);
    expect(masks().every((mask) => mask.style.zIndex === '10')).toBe(true);
    expect(border()?.style.zIndex).toBe('11');
    expect(border()?.style.position).toBe('fixed');
  });

  it('uses custom maskZIndex and keeps border one layer above masks', () => {
    const button = appendVisibleButton();

    const result = highlightElement(button, { maskZIndex: 88 });

    expect(result.ok).toBe(true);
    expect(masks().every((mask) => mask.style.zIndex === '88')).toBe(true);
    expect(border()?.style.zIndex).toBe('89');
  });

  it('cleans all highlight nodes when any mask is clicked', () => {
    const button = appendVisibleButton();
    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    masks()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(masks()).toHaveLength(0);
    expect(border()).toBeNull();
    expect(document.querySelector('[data-agent-dom-highlight-style]')).toBeNull();
  });

  it('cleans highlight on target click while preserving target click behavior', () => {
    const button = appendVisibleButton();
    const listener = vi.fn();
    button.addEventListener('click', listener);
    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(masks()).toHaveLength(0);
    expect(border()).toBeNull();
  });

  it('returns unsupported element for non-HTMLElement targets', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(svg);

    const result = highlightElement(svg);

    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_ELEMENT' });
  });

  it('returns not visible for hidden targets', () => {
    const button = appendVisibleButton();
    button.hidden = true;

    const result = highlightElement(button);

    expect(result).toMatchObject({ ok: false, code: 'NOT_VISIBLE' });
  });

  it('returns action failed and leaves no nodes when mounting throws', () => {
    const button = appendVisibleButton();
    const originalAppend = document.body.append;
    document.body.append = (() => { throw new Error('boom'); }) as typeof document.body.append;

    try {
      const result = highlightElement(button);

      expect(result).toMatchObject({ ok: false, code: 'ACTION_FAILED' });
      expect(masks()).toHaveLength(0);
      expect(border()).toBeNull();
    } finally {
      document.body.append = originalAppend;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/highlight.test.ts`

Expected: FAIL because `../src/highlight` does not exist.

---

### Task 2: Implement Highlight DOM Lifecycle

**Files:**
- Create: `src/highlight.ts`
- Test command: `pnpm test test/highlight.test.ts`

- [ ] **Step 1: Add the highlight implementation**

Create `src/highlight.ts`:

```ts
import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { AgentDomResult, HighlightOptions } from './types';

export interface HighlightHandle {
  cleanup(): void;
}

const DEFAULT_MASK_Z_INDEX = 10;
const MASK_ATTR = 'data-agent-dom-highlight-mask';
const BORDER_ATTR = 'data-agent-dom-highlight-border';
const STYLE_ATTR = 'data-agent-dom-highlight-style';

export function highlightElement(
  element: Element,
  options: HighlightOptions = {},
): AgentDomResult<HighlightHandle> {
  if (!(element instanceof HTMLElement)) {
    return failure('UNSUPPORTED_ELEMENT', 'Target is not an HTMLElement');
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', 'Target is not visible');
  }

  const createdNodes: HTMLElement[] = [];
  let targetClickListener: ((event: MouseEvent) => void) | null = null;

  const cleanup = (): void => {
    for (const node of createdNodes) node.remove();
    if (targetClickListener) {
      element.removeEventListener('click', targetClickListener, true);
      targetClickListener = null;
    }
  };

  try {
    element.scrollIntoView({ block: 'center', inline: 'center' });

    const rect = element.getBoundingClientRect();
    const maskZIndex = options.maskZIndex ?? DEFAULT_MASK_Z_INDEX;
    const borderZIndex = maskZIndex + 1;
    const doc = element.ownerDocument;
    const mount = doc.body ?? doc.documentElement;
    const masks = createMasks(doc, rect, maskZIndex);
    const border = createBorder(doc, rect, borderZIndex);
    const style = createStyle(doc);

    createdNodes.push(...masks, border, style);

    const closeOnMaskClick = (): void => cleanup();
    for (const mask of masks) {
      mask.addEventListener('click', closeOnMaskClick, { once: true });
    }

    targetClickListener = () => cleanup();
    element.addEventListener('click', targetClickListener, true);

    mount.append(...createdNodes);
  } catch (error) {
    cleanup();
    return failure('ACTION_FAILED', 'Highlight failed', error);
  }

  return success({ cleanup });
}

function createMasks(doc: Document, rect: DOMRect, zIndex: number): HTMLElement[] {
  const top = createMask(doc, zIndex, {
    top: '0px',
    left: '0px',
    width: '100vw',
    height: `${Math.max(0, rect.top)}px`,
  });
  const right = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.top)}px`,
    left: `${Math.max(0, rect.right)}px`,
    width: `calc(100vw - ${Math.max(0, rect.right)}px)`,
    height: `${Math.max(0, rect.height)}px`,
  });
  const bottom = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.bottom)}px`,
    left: '0px',
    width: '100vw',
    height: `calc(100vh - ${Math.max(0, rect.bottom)}px)`,
  });
  const left = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.top)}px`,
    left: '0px',
    width: `${Math.max(0, rect.left)}px`,
    height: `${Math.max(0, rect.height)}px`,
  });

  return [top, right, bottom, left];
}

function createMask(
  doc: Document,
  zIndex: number,
  box: Pick<CSSStyleDeclaration, 'top' | 'left' | 'width' | 'height'>,
): HTMLElement {
  const mask = doc.createElement('div');
  mask.setAttribute(MASK_ATTR, 'true');
  Object.assign(mask.style, {
    position: 'fixed',
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    background: 'rgba(0, 0, 0, 0.55)',
    zIndex: String(zIndex),
    pointerEvents: 'auto',
  });
  return mask;
}

function createBorder(doc: Document, rect: DOMRect, zIndex: number): HTMLElement {
  const border = doc.createElement('div');
  border.setAttribute(BORDER_ATTR, 'true');
  Object.assign(border.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: 'border-box',
    border: '3px solid transparent',
    borderRadius: '4px',
    animation: 'agent-dom-highlight-rgb 1.2s linear infinite',
    zIndex: String(zIndex),
    pointerEvents: 'none',
  });
  return border;
}

function createStyle(doc: Document): HTMLElement {
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTR, 'true');
  style.textContent = `
@keyframes agent-dom-highlight-rgb {
  0% { border-color: rgb(255, 0, 0); box-shadow: 0 0 8px rgb(255, 0, 0); }
  33% { border-color: rgb(0, 255, 0); box-shadow: 0 0 8px rgb(0, 255, 0); }
  66% { border-color: rgb(0, 128, 255); box-shadow: 0 0 8px rgb(0, 128, 255); }
  100% { border-color: rgb(255, 0, 0); box-shadow: 0 0 8px rgb(255, 0, 0); }
}`;
  return style;
}
```

- [ ] **Step 2: Run highlight unit tests**

Run: `pnpm test test/highlight.test.ts`

Expected: PASS for all `highlightElement` tests.

---

### Task 3: Wire Public AgentDom API

**Files:**
- Modify: `src/types.ts`
- Modify: `src/agent-dom.ts`
- Modify: `test/agent-dom.test.ts`
- Test command: `pnpm test test/agent-dom.test.ts`

- [ ] **Step 1: Add failing public API tests**

Append these tests inside `describe('createAgentDom', () => { ... })` in `test/agent-dom.test.ts`:

```ts
  it('highlights by selector through the public API', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const button = document.getElementById('save')!;
    button.getBoundingClientRect = () => ({
      x: 20,
      y: 30,
      left: 20,
      top: 30,
      right: 120,
      bottom: 70,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });
    const agentDom = createAgentDom();

    const result = agentDom.highlight('#save', { maskZIndex: 42 });

    expect(result).toEqual({ ok: true, data: { target: '#save' } });
    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
    expect(document.querySelector<HTMLElement>('[data-agent-dom-highlight-mask]')?.style.zIndex).toBe('42');
  });

  it('allows highlight in readOnly mode', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const button = document.getElementById('save')!;
    button.getBoundingClientRect = () => ({
      x: 20,
      y: 30,
      left: 20,
      top: 30,
      right: 120,
      bottom: 70,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    });
    const agentDom = createAgentDom({ readOnly: true });

    const result = agentDom.highlight('#save');

    expect(result.ok).toBe(true);
    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
  });

  it('replaces the previous highlight on repeated calls', () => {
    document.body.innerHTML = '<button id="first">一</button><button id="second">二</button>';
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('button'))) {
      element.getBoundingClientRect = () => ({
        x: 20,
        y: 30,
        left: 20,
        top: 30,
        right: 120,
        bottom: 70,
        width: 100,
        height: 40,
        toJSON: () => ({}),
      });
    }
    const agentDom = createAgentDom();

    expect(agentDom.highlight('#first').ok).toBe(true);
    expect(agentDom.highlight('#second').ok).toBe(true);

    expect(document.querySelectorAll('[data-agent-dom-highlight-mask]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-agent-dom-highlight-border]')).toHaveLength(1);
  });

  it('returns policy blocked when highlight target is denied', () => {
    document.body.innerHTML = '<button id="save">保存</button>';
    const agentDom = createAgentDom({ denySelectors: ['#save'] });

    const result = agentDom.highlight('#save');

    expect(result).toMatchObject({ ok: false, code: 'POLICY_BLOCKED' });
  });
```

- [ ] **Step 2: Run API tests to verify they fail**

Run: `pnpm test test/agent-dom.test.ts`

Expected: FAIL because `AgentDom.highlight` is not defined.

- [ ] **Step 3: Add public types**

Modify `src/types.ts` so the relevant section becomes:

```ts
export interface ActionResult {
  target: string;
}

export interface HighlightOptions {
  maskZIndex?: number;
}

export interface WaitOptions {
  timeoutMs?: number;
  state?: 'attached' | 'visible';
  text?: string;
}
```

And extend `AgentDom`:

```ts
export interface AgentDom {
  snapshot(options?: SnapshotOptions): AgentDomResult<SnapshotResult>;
  click(target: string): Promise<AgentDomResult<ActionResult>>;
  fill(target: string, value: string): Promise<AgentDomResult<ActionResult>>;
  focus(target: string): Promise<AgentDomResult<ActionResult>>;
  highlight(target: string, options?: HighlightOptions): AgentDomResult<ActionResult>;
  getText(target?: string): AgentDomResult<string>;
  isVisible(target: string): AgentDomResult<boolean>;
  waitFor(target: string, options?: WaitOptions): Promise<AgentDomResult<ActionResult>>;
}
```

- [ ] **Step 4: Wire implementation in `createAgentDom`**

Modify imports in `src/agent-dom.ts`:

```ts
import { highlightElement, type HighlightHandle } from './highlight';
```

Modify the type import from `./types` to include `HighlightOptions`:

```ts
import type { ActionResult, AgentDom, AgentDomOptions, AgentDomResult, HighlightOptions, SnapshotOptions, SnapshotResult, WaitOptions } from './types';
```

Add this variable after `const registry = new RefRegistry();`:

```ts
  let activeHighlight: HighlightHandle | null = null;
```

Add this method in the returned object after `focus` and before `getText`:

```ts
    highlight(target: string, highlightOptions?: HighlightOptions): AgentDomResult<ActionResult> {
      activeHighlight?.cleanup();
      activeHighlight = null;

      const resolved = resolve(target);
      if (!resolved.ok) return resolved;

      const highlighted = highlightElement(resolved.data, highlightOptions);
      if (!highlighted.ok) return highlighted;

      activeHighlight = highlighted.data;
      return success({ target });
    },
```

- [ ] **Step 5: Run API tests**

Run: `pnpm test test/agent-dom.test.ts`

Expected: PASS for all `createAgentDom` tests.

---

### Task 4: Run Focused and Full Validation

**Files:**
- No file edits expected.
- Commands: `pnpm test test/highlight.test.ts`, `pnpm test test/agent-dom.test.ts`, `pnpm test`, `pnpm typecheck`

- [ ] **Step 1: Run focused highlight tests**

Run: `pnpm test test/highlight.test.ts`

Expected: PASS.

- [ ] **Step 2: Run focused AgentDom tests**

Run: `pnpm test test/agent-dom.test.ts`

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS.

---

## Self-Review

- Spec coverage: API shape, default `maskZIndex`, readOnly allowance, replacement behavior, four-mask rendering, target click preservation, mask click close, automatic scroll, policy errors, visibility errors, and tests are all covered by tasks above.
- Placeholder scan: no TBD/TODO/fill-later wording is present.
- Type consistency: `HighlightOptions`, `HighlightHandle`, `highlightElement`, and `AgentDom.highlight` names are consistent across tests and implementation steps.
- Scope check: plan keeps the feature to single-target highlight only and does not add resize/scroll tracking or styling customization beyond `maskZIndex`.
