# Framework Adapter 重构 + Quasar 兼容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Ant Design 兼容逻辑从核心代码中抽取为 `FrameworkAdapter` 策略，建立可扩展的 UI 框架适配机制；搭建 Quasar 集成测试环境；为 Quasar 添加适配器。

**Architecture:** 内部 strategy 模式——新增 `src/frameworks/types.ts` 定义适配接口，每个 UI 框架独立实现一个 adapter 文件。`snapshot.ts` 和 `actions.ts` 中的核心逻辑不再包含框架专属选择器，改为遍历 adapter 链调用各框架的钩子方法。暂不暴露公共 plugin API。

**Tech Stack:** TypeScript, Vitest + jsdom, Vite

**相关文件:**
- 新建: `src/frameworks/types.ts`, `src/frameworks/antd.ts`, `src/frameworks/quasar.ts`
- 修改: `src/snapshot.ts:1-222`, `src/actions.ts:1-197`, `src/agent-dom.ts:1-80`, `src/index.ts:1-3`
- 测试: `test/snapshot.test.ts`, `test/actions.test.ts`（可能扩展适配器相关测试）
- 文档: `web-test/README.md`

---

### Task 1: 创建 FrameworkAdapter 接口定义

**Files:**
- Create: `src/frameworks/types.ts`

- [ ] **Step 1: 创建适配器类型文件**

```typescript
// src/frameworks/types.ts

import type { SnapshotNode } from '../types';

/** 快照中内联渲染的虚拟子节点（如下拉选项） */
export interface FrameworkSnapshotChild {
  /** ref 标识（格式如 "e16-1"）, 由 adapter 生成 */
  ref: string;
  role: string;
  name: string;
  tagName: string;
  /** 对应的 DOM 元素，用于 ref registry 注册和去重 */
  element: Element;
}

/**
 * UI 框架适配器接口。
 * 每个 UI 框架（Ant Design, Quasar, Element Plus 等）各实现一个 adapter 对象。
 */
export interface FrameworkAdapter {
  /** 框架名称（用于调试日志） */
  name: string;

  /**
   * 额外的 CSS 选择器，这些元素会被纳入快照遍历。
   * 例如 AntD 需要 `.ant-select-item-option`（不在基础 `SNAPSHOT_SELECTOR` 中）。
   */
  snapshotSelectors?: string[];

  /**
   * 对元素进行框架专属的 SnapshotNode 属性覆盖/增强。
   * 在核心 describeElement 之后调用，返回值通过 Object.assign 合并。
   *
   * 注意：adapter 应自行判断是否需要覆盖（例如，只在元素没有原生 placeholder 时才返回占位符）。
   *
   * @param element 当前快照元素
   * @returns 需要覆盖/增强的 SnapshotNode 属性，或 null 表示无需处理
   */
  describeElement?(element: Element): Partial<SnapshotNode> | null;

  /**
   * 当快照发现此 adapter 识别的元素时（如已展开的下拉选择器），
   * 返回需要内联渲染的虚拟子节点（如下拉选项列表）。
   *
   * @param element 当前快照元素（如展开的 select 的 input）
   * @param parentRef 父元素的 ref 标识（adapter 生成的子 ref 应以此为基础，如 `${parentRef}-1`）
   * @returns 虚拟子节点列表，或空数组
   */
  getInlineChildren?(element: Element, parentRef: string): FrameworkSnapshotChild[];

  /**
   * 在点击前重定向点击目标到组件内更合适的元素。
   * 例如 AntD 的 `.ant-select-selection-search-input` 应重定向到 `.ant-select-selector`。
   *
   * adapter 链按顺序调用，首个返回非 null 的结果即为最终点击目标。
   *
   * @param element 即将被点击的元素
   * @returns 重定向后的目标元素，或 null 表示无需重定向
   */
  normalizeClickTarget?(element: HTMLElement): HTMLElement | null;

  /**
   * 获取元素在快照文本中的附加提示信息。
   * 例如 AntD combobox 需要显示 "click to get options"。
   *
   * @returns 提示文本，或 null 表示无需提示
   */
  getElementHint?(element: Element): string | null;
}
```

- [ ] **Step 2: 确认文件可编译**

Run: `pnpm typecheck`

Expected: 无错误（文件本身没有运行时代码，只有类型导出）

- [ ] **Step 3: 提交**

```bash
git add src/frameworks/types.ts
git commit -m "feat: add FrameworkAdapter interface definition"
```

---

### Task 2: 从 snapshot.ts 提取 AntD adapter

**Files:**
- Create: `src/frameworks/antd.ts`
- Modify: `src/snapshot.ts:1-222`（移除所有 `.ant-select` 相关代码）

- [ ] **Step 1: 创建 AntD adapter 文件**

```typescript
// src/frameworks/antd.ts

import type { FrameworkAdapter, FrameworkSnapshotChild } from './types';
import type { SnapshotNode } from '../types';

/** 从 AntD Select 组件中提取 placeholder 文本 */
function getAntdPlaceholder(element: Element): string | null {
  const selectRoot = element.closest('.ant-select');
  if (!selectRoot) return null;
  return selectRoot.querySelector('.ant-select-selection-placeholder')?.textContent?.trim()
    || selectRoot.querySelector('.ant-select-placeholder')?.textContent?.trim()
    || null;
}

export const antdAdapter: FrameworkAdapter = {
  name: 'antd',

  // AntD 下拉选项需要额外的选择器才能被快照发现
  snapshotSelectors: [
    '.ant-select-item-option',
  ],

  describeElement(element: Element): Partial<SnapshotNode> | null {
    const overrides: Partial<SnapshotNode> = {};

    // AntD Select: 读取真实 placeholder（元素为受控 input，原生 placeholder 可能为空）
    if (element instanceof HTMLInputElement && element.closest('.ant-select')) {
      if (!element.placeholder) {
        const placeholder = getAntdPlaceholder(element);
        if (placeholder) overrides.placeholder = placeholder;
      }
      // AntD Select: 从 .ant-select-content 读取已选值
      const selectRoot = element.closest('.ant-select')!;
      const content = selectRoot.querySelector('.ant-select-content');
      if (content) {
        const selected = content.getAttribute('title')?.trim()
          || content.textContent?.replace(element.value, '').trim()
          || undefined;
        if (selected) overrides.value = selected;
      }
    }

    // AntD 下拉选项：覆盖 role 和 name
    if (element.matches('.ant-select-item-option')) {
      overrides.role = 'option';
      overrides.name =
        element.querySelector('.ant-select-item-option-content')?.textContent?.trim()
        || element.getAttribute('title')
        || '';
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  },

  getInlineChildren(element: Element, parentRef: string): FrameworkSnapshotChild[] {
    if (!(element instanceof HTMLInputElement)) return [];
    if (!element.closest('.ant-select')) return [];
    if (element.getAttribute('aria-expanded') !== 'true') return [];

    const children: FrameworkSnapshotChild[] = [];
    document.querySelectorAll(
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option'
    ).forEach((opt, idx) => {
      children.push({
        ref: `${parentRef}-${idx + 1}`,
        role: 'option',
        name:
          opt.querySelector('.ant-select-item-option-content')?.textContent?.trim()
          || opt.getAttribute('title')
          || '',
        tagName: 'div',
        element: opt,
      });
    });
    return children;
  },

  normalizeClickTarget(element: HTMLElement): HTMLElement | null {
    if (element.matches('.ant-select-selection-search-input')) {
      const selector = element.closest('.ant-select')?.querySelector('.ant-select-selector');
      if (selector instanceof HTMLElement) return selector;
    }
    return null;
  },

  getElementHint(element: Element): string | null {
    if (element instanceof HTMLInputElement && element.closest('.ant-select')) {
      return 'click to get options';
    }
    return null;
  },
};
```

- [ ] **Step 2: 重构 snapshot.ts — 移除 AntD 逻辑，接入 adapter 链**

现在 snapshot.ts 有三个 AntD 耦合区域需要改造：

**区域 A (Line 6-19): SNAPSHOT_SELECTOR → 支持 adapter 追加选择器**

**区域 B (Line 79-87): 快照主循环中的 AntD hint + dropdown 逻辑 → adapter hook**

**区域 C (Line 116-181): `describeElement` 中多处 `.ant-select` → 移到 adapter**

**区域 D (Line 216-222): `getAntdPlaceholder` 辅助函数 → 移到 adapter**

重构后的 snapshot.ts 签名：

```typescript
// 导入 adapter 类型
import type { FrameworkAdapter } from './frameworks/types';

// 基础选择器（框架无关）
const BASE_SELECTORS = [
  'h1', 'h2', 'h3',
  'table', 'ul', 'ol',
  'button',
  'a[href]',
  'input', 'textarea', 'select',
  'summary',
  '[role]', '[tabindex]',
  '[contenteditable="true"]',
];

/** 合并基础选择器和 adapter 提供的额外选择器 */
function getSnapshotSelector(adapters: readonly FrameworkAdapter[]): string {
  const selectors = [...BASE_SELECTORS];
  for (const adapter of adapters) {
    if (adapter.snapshotSelectors) {
      selectors.push(...adapter.snapshotSelectors);
    }
  }
  return selectors.join(',');
}

// createSnapshot 新签名：接受 adapters 参数
export function createSnapshot(
  root: ParentNode,
  registry: RefRegistry,
  options: Pick<AgentDomOptions, 'maskSensitiveValues' | 'allowSelectors' | 'denySelectors'> = {},
  adapters: readonly FrameworkAdapter[] = [],
): SnapshotResult {
  registry.clear();

  const lines: string[] = [];
  const nodes: SnapshotNode[] = [];
  const scope = root instanceof Document ? root.body : root;
  const seenOptions = new Set<Element>();

  const allSelectors = getSnapshotSelector(adapters);

  scope.querySelectorAll(allSelectors).forEach((element) => {
    if (!isElementVisible(element)) return;
    if (!isAllowedByPolicy(element, options)) return;

    const tag = element.tagName.toLowerCase();

    // heading / table / ul/ol 处理不变
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const name = element.textContent?.replace(/\s+/g, ' ').trim();
      if (name) lines.push(`- heading "${escapeText(name)}"`);
      return;
    }

    if (tag === 'table') {
      const rows = element.querySelectorAll('tr');
      const headerCells = rows[0]?.querySelectorAll('th');
      const headerTexts = headerCells?.length
        ? Array.from(headerCells).map((th) => th.textContent?.trim() ?? '')
        : null;
      const bodyRows: string[] = [];
      let rowCount = 0;
      rows.forEach((row, idx) => {
        if (headerTexts && idx === 0 && row.querySelector('th')) return;
        const cells = row.querySelectorAll('td');
        if (!cells.length) return;
        rowCount++;
        bodyRows.push(`  | ${Array.from(cells).map((td) => td.textContent?.trim() ?? '').join(' | ')} |`);
      });
      const header = headerTexts ? `\n  | ${headerTexts.join(' | ')} |` : '';
      lines.push(`- table [${rowCount} rows]${header}${bodyRows.length ? '\n' + bodyRows.join('\n') : ''}`);
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      element.querySelectorAll(':scope > li').forEach((li) => {
        const text = li.textContent?.replace(/\s+/g, ' ').trim();
        if (text) items.push(text);
      });
      if (items.length) {
        lines.push(`- ${tag} [${items.length} items]${items.map((t) => `\n  - "${escapeText(t)}"`).join('')}`);
      }
      return;
    }

    // ===== 交互元素：核心逻辑 + adapter 链 =====
    const ref = registry.register(element);

    // 核心 describeElement（框架无关）
    const node = describeElement(element, ref, options.maskSensitiveValues ?? true);

    // Adapter 链：描述覆盖
    for (const adapter of adapters) {
      const overrides = adapter.describeElement?.(element);
      if (overrides) {
        Object.assign(node, overrides);
      }
    }

    nodes.push(node);
    let line = renderNode(node);

    // Adapter 链：hint 文本
    for (const adapter of adapters) {
      const hint = adapter.getElementHint?.(element);
      if (hint) {
        line += ` # ${hint}`;
        break;
      }
    }
    lines.push(line);

    // Adapter 链：内联子节点（如下拉选项）
    for (const adapter of adapters) {
      const children = adapter.getInlineChildren?.(element, ref) ?? [];
      for (const child of children) {
        if (seenOptions.has(child.element)) continue;
        seenOptions.add(child.element);
        registry.registerChild(child.ref, child.element);
        const childNode: SnapshotNode = {
          ref: child.ref,
          role: child.role,
          name: child.name,
          tagName: child.tagName,
        };
        nodes.push(childNode);
        lines.push(`  ${renderNode(childNode)}`);
      }
    }
  });

  return { text: lines.join('\n'), nodes };
}
```

describeElement 移除 AntD 代码后：

```typescript
function describeElement(element: Element, ref: string, maskSensitiveValues: boolean): SnapshotNode {
  const role = getRole(element);
  const name = getAccessibleName(element);
  const node: SnapshotNode = {
    ref,
    role,
    name,
    tagName: element.tagName.toLowerCase(),
  };

  if (element instanceof HTMLAnchorElement && element.href) {
    node.href = element.href;
  }

  if (element instanceof HTMLInputElement) {
    node.inputType = element.type;
    node.placeholder = element.placeholder || undefined;
    node.required = element.required || undefined;
    captureValidation(element, node);
  }

  if (element instanceof HTMLTextAreaElement) {
    node.placeholder = element.placeholder || undefined;
    node.required = element.required || undefined;
    captureValidation(element, node);
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    node.value = maskSensitiveValues && isSensitiveElement(element) ? '[masked]' : safeValue(element);
    node.disabled = element.disabled;
  }

  if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
    node.checked = element.checked;
  }

  if (element instanceof HTMLSelectElement) {
    node.value = safeValue(element);
    node.disabled = element.disabled;
    node.required = element.required || undefined;
    node.options = Array.from(element.options).map((opt) => opt.textContent?.trim() ?? opt.value);
    captureValidation(element, node);
  }

  if (element instanceof HTMLButtonElement) {
    node.disabled = node.disabled || element.disabled;
  }

  return node;
}
```

**注意：移除了以下代码:**
- `node.placeholder = element.placeholder || getAntdPlaceholder(element) || undefined;` → 变为 `element.placeholder || undefined`，AntD placeholder 由 adapter 补充
- `element.closest('.ant-select')` value 覆盖逻辑 → 移到 adapter
- `.ant-select-item-option` role/name 覆盖 → 移到 adapter
- `node.role === 'combobox' && element.closest('.ant-select')` hint → 移到 adapter
- 整个 AntD dropdown inline children 代码块 → 移到 adapter
- `getAntdPlaceholder` 函数 → 移到 adapter
- `escapeText`, `safeValue`, `renderNode`, `captureValidation` 保持不变

- [ ] **Step 3: 运行现有测试确认无回归**

Run: `pnpm test`

Expected: 所有现有测试通过（snapshot.test.ts 测试的 HTML 不含 AntD 结构，应不受影响）

- [ ] **Step 4: 提交**

```bash
git add src/frameworks/antd.ts src/snapshot.ts
git commit -m "refactor: extract AntD adapter from snapshot.ts"
```

---

### Task 3: 重构 actions.ts — normalizeClickTarget 改为 adapter 链

**Files:**
- Modify: `src/actions.ts:1-197`

- [ ] **Step 1: 修改 normalizeClickTarget 函数签名**

```typescript
// 新增导入
import type { FrameworkAdapter } from './frameworks/types';

// 重构 normalizeClickTarget：接收 adapter 链
function normalizeClickTarget(element: HTMLElement, adapters: readonly FrameworkAdapter[]): HTMLElement {
  // Adapter 链：按顺序调用，首个返回非 null 即为最终目标
  for (const adapter of adapters) {
    const result = adapter.normalizeClickTarget?.(element);
    if (result) return result;
  }
  // 通用 fallback: 如果元素是 role=combobox 内部的 input，重定向到 combobox 本身
  if (element instanceof HTMLInputElement && element.closest('[role="combobox"]')) {
    const wrapper = element.closest('[role="combobox"]');
    if (wrapper instanceof HTMLElement) return wrapper;
  }
  return element;
}
```

**注意：移除了 `.ant-select-selection-search-input` 硬编码，改为通过 adapter 链处理。**

- [ ] **Step 2: 更新 clickElement 函数签名，传递给所有下游函数**

`clickElement`, `fillElement`, `focusElement` 原本都是内部函数，需要增加 adapters 参数传递给 normalizeClickTarget 和未来的其他 adapter hook。

但 `fillElement` 和 `focusElement` 目前不需要 adapter，只需要让 `clickElement` 能访问 adapter 链。

修改方式：给 `clickElement` 增加 adapters 参数：

```typescript
export async function clickElement(
  element: Element,
  target: string,
  adapters: readonly FrameworkAdapter[] = [],
): Promise<AgentDomResult<ActionResult>> {
  // ...前置检查不变...
  try {
    const clickTarget = normalizeClickTarget(element, adapters);
    // ...其余逻辑不变...
  }
  // ...
}
```

- [ ] **Step 3: 运行测试**

Run: `pnpm test`

Expected: 所有 actions 测试通过

- [ ] **Step 4: 提交**

```bash
git add src/actions.ts
git commit -m "refactor: use adapter chain for click target normalization"
```

---

### Task 4: 串联 adapter 到 agent-dom.ts

**Files:**
- Modify: `src/agent-dom.ts:1-80`

- [ ] **Step 1: 引入 adapter 并在内部组装**

```typescript
// 在 agent-dom.ts 顶部新增导入
import { antdAdapter } from './frameworks/antd';
import type { FrameworkAdapter } from './frameworks/types';

// createAgentDom 内部：构建内置 adapter 列表
// 暂不暴露到公共 API
const BUILTIN_ADAPTERS: readonly FrameworkAdapter[] = [
  antdAdapter,
  // quasarAdapter 将在后续任务中加入
];
```

- [ ] **Step 2: 将 adapters 传给 snapshot 和 clickElement**

修改 `createAgentDom` 中的调用：

```typescript
// snapshot 调用：传入 adapters
snapshot(snapOptions?: SnapshotOptions): AgentDomResult<SnapshotResult> {
  return success(createSnapshot(
    snapOptions?.scope ?? root,
    registry,
    {
      maskSensitiveValues: options.maskSensitiveValues ?? true,
      allowSelectors: options.allowSelectors,
      denySelectors: options.denySelectors,
    },
    BUILTIN_ADAPTERS,  // ← 新增
  ));
},

// click 调用：传入 adapters
async click(target: string): Promise<AgentDomResult<ActionResult>> {
  if (options.readOnly) return failure('POLICY_BLOCKED', 'AgentDom is read-only');
  const resolved = resolve(target);
  return resolved.ok
    ? clickElement(resolved.data, target, BUILTIN_ADAPTERS)  // ← 新增参数
    : resolved;
},
```

- [ ] **Step 3: 运行测试**

Run: `pnpm test`

Expected: 全部 30 个测试通过

- [ ] **Step 4: 提交**

```bash
git add src/agent-dom.ts
git commit -m "feat: wire FrameworkAdapter into agent-dom factory"
```

---

### Task 5: 创建 Quasar adapter 占位 + 集成测试环境

**Files:**
- Create: `src/frameworks/quasar.ts`（占位 adapter，后续根据实测填充）
- Modify: `web-test/README.md`
- Create: `web-test/quasar/`（目录及所有文件 — 已在本次会话中创建）

- [ ] **Step 1: 创建 Quasar adapter 占位**

```typescript
// src/frameworks/quasar.ts

import type { FrameworkAdapter } from './types';

/**
 * Quasar UI 框架适配器。
 * 
 * 当前为占位实现，不包含任何业务逻辑。
 * 待集成测试环境搭建完成后，根据实测结果填充：
 * - QSelect 下拉选项的发现和渲染
 * - QInput 的 placeholder 读取
 * - QSelect 点击目标归一化
 * - QTable 和 QDialog 的兼容处理
 *
 * Quasar 组件 DOM 特征（参考）：
 * - QSelect: .q-select, role="combobox", 下拉在 .q-menu 中
 * - QInput: .q-field__native input, label 在 .q-field__label
 * - QBtn: <button class="q-btn">
 * - QCheckbox/QToggle: .q-checkbox / .q-toggle, 隐藏原生 input
 * - QTable: <table class="q-table"> 或虚拟滚动版本
 * - QDialog: .q-dialog, role="dialog"
 */
export const quasarAdapter: FrameworkAdapter = {
  name: 'quasar',

  // TODO: 添加 Quasar 专用选择器
  // snapshotSelectors: [
  //   '.q-item__label',
  // ],

  // TODO: 实现 describeElement（placeholder, value, role 覆盖）
  // describeElement(element) { ... },

  // TODO: 实现 getInlineChildren（QSelect dropdown options）
  // getInlineChildren(element, parentRef) { ... },

  // TODO: 实现 normalizeClickTarget（QSelect 内部 input → selector 表面）
  // normalizeClickTarget(element) { ... },

  // TODO: 实现 getElementHint
  // getElementHint(element) { ... },
};
```

- [ ] **Step 2: 将 quasarAdapter 注册到 BUILTIN_ADAPTERS（注释形式，暂不激活）**

在 `src/agent-dom.ts` 的 `BUILTIN_ADAPTERS` 数组中，以注释形式加入 Quasar adapter：

```typescript
const BUILTIN_ADAPTERS: readonly FrameworkAdapter[] = [
  antdAdapter,
  // TODO: 激活 Quasar adapter — 待兼容逻辑实现后取消注释
  // quasarAdapter,
];
```

这样配置结构已就位，后续实测后只需填充 adapter 内容 + 取消注释即可。

- [ ] **Step 3: 安装 Quasar 集成测试环境依赖**

Run:
```bash
cd web-test/quasar
pnpm install
```

Expected: 依赖安装成功，quasar + @quasar/extras + @quasar/vite-plugin 等均安装完毕

- [ ] **Step 4: 确认 Quasar 测试页可启动**

先确保 dist 目录有最新构建：

```bash
pnpm build  # 在项目根目录
```

然后启动 Quasar 测试页：

```bash
cd web-test/quasar
pnpm dev
```

Expected: Vite 启动成功，访问 `http://localhost:5173` 可看到 Quasar 测试页面

- [ ] **Step 5: 更新 web-test/README.md**

在 `web-test/README.md` 中增加 Quasar 相关说明：

在文件末尾追加：
```markdown
Quasar:

```bash
cd web-test/quasar
pnpm install
pnpm dev
```
```

同时在文件开头的目录列表中增加 `- quasar/`。

完整的 README 修改参见 task 指令中的详细代码。

- [ ] **Step 6: 运行完整测试套件**

Run: `pnpm test`

Expected: 全部测试通过

- [ ] **Step 7: 提交**

```bash
git add src/frameworks/quasar.ts src/agent-dom.ts web-test/quasar/ web-test/README.md
git commit -m "feat: add Quasar adapter placeholder and integration test environment"
```

---

### Task 6: 最终验证与审查

**Files:** 无新建，全量检查

- [ ] **Step 1: TypeScript 类型检查**

Run: `pnpm typecheck`

Expected: 零错误

- [ ] **Step 2: 运行全部测试**

Run: `pnpm test`

Expected: 全部 30 个测试通过

- [ ] **Step 3: 构建验证**

Run: `pnpm build`

Expected: 构建成功，dist/ 目录更新

- [ ] **Step 4: LSP 诊断检查**

检查以下文件无 LSP 错误：
- `src/frameworks/types.ts`
- `src/frameworks/antd.ts`
- `src/frameworks/quasar.ts`
- `src/snapshot.ts`
- `src/actions.ts`
- `src/agent-dom.ts`

- [ ] **Step 5: 确认导出**

`src/index.ts` 目前导出 `createAgentDom`, `failure`, `success` 及所有类型。FrameworkAdapter 类型通过 `types.ts` 的 `export type *` 自动导出。确认：

```typescript
// src/index.ts 应保持不变
export type * from './types';
export { createAgentDom } from './agent-dom';
export { failure, success } from './result';
```

注意：`FrameworkAdapter` 类型定义在 `src/frameworks/types.ts`，不在 `src/types.ts` 中，因此不会通过 `export type * from './types'` 导出。这是正确的——因为 framework adapter 是内部机制，暂不暴露到公共 API。

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "chore: final verification after framework adapter refactoring"
```

---

### 完成状态

重构完成后：
- ✅ `snapshot.ts` 零 AntD 硬编码，只调用 adapter 链
- ✅ `actions.ts` 零框架专属选择器，normalizeClickTarget 通过 adapter 链 + 通用 fallback 处理
- ✅ AntD 兼容逻辑完全隔离在 `src/frameworks/antd.ts`
- ✅ Quasar adapter 占位就绪，`src/frameworks/quasar.ts` 中有详细的 Quasar DOM 结构注释指导下一步开发
- ✅ Quasar 集成测试环境可用（`web-test/quasar/`）
- ✅ 公共 API（AgentDom, AgentDomOptions 等）无变更
- ✅ 所有现有测试通过
