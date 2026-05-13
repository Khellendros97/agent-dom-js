# Agent DOM JS 设计文档

## 背景

用户正在制作一个内联在网页中的 AI 助理。宿主网站与 AI 助理之间的通讯协议已实现，本项目只需要提供一个浏览器端 JavaScript 库，让宿主网站调用它来获取页面快照并执行 DOM 操作。

参考项目位于 `.reference/agent-browser`。该项目是一个 Rust CLI，通过 daemon、Chrome DevTools Protocol 和浏览器进程控制实现网页自动化。本项目目标不是复制 CLI，而是参考其“语义快照、元素引用、动作抽象”的设计，在当前页面的可访问 DOM 内实现类似能力。

## 现状分析

相关参考文件：

- `.reference/agent-browser/README.md`：列出 `snapshot`、`click`、`fill`、`get`、`wait` 等用户侧命令。
- `.reference/agent-browser/AGENTS.md`：说明参考项目核心架构，daemon 位于 `cli/src/native/`。
- `.reference/agent-browser/cli/src/commands.rs`：将 CLI 命令解析为 JSON action。
- `.reference/agent-browser/cli/src/connection.rs`：负责 CLI 与 daemon 的 socket/TCP 通讯。
- `.reference/agent-browser/cli/src/main.rs`：CLI 入口，处理命令解析、daemon 启动和响应输出。

参考项目中可借鉴的部分：

- 命令式 API 形态：`snapshot`、`click`、`fill`、`get text` 等。
- 通过快照生成 `ref`，再用 `ref` 执行动作。
- 将元素定位、动作执行、状态检查拆成独立模块。
- 返回结构化结果，便于宿主或 AI 消费。

参考项目中不适合迁移到浏览器端 JS 库的部分：

- daemon、socket/TCP、进程管理。
- Chrome DevTools Protocol 相关能力，例如 `Accessibility.getFullAXTree`、`Input.dispatchMouseEvent`、`DOM.getBoxModel`。
- 跨站打开网页、真实浏览器级输入、截图、PDF、HAR、网络拦截、浏览器 profile 管理。
- 跨域 iframe 控制。

因此，本项目的边界应定义为：只操作当前宿主页面中当前脚本可访问的 DOM。

## 目标

提供一个浏览器端 JS 库，供宿主网站直接调用：

- 生成适合 AI 阅读的页面语义快照。
- 为可操作元素分配稳定的短引用，例如 `e1`、`e2`。
- 支持通过 `@e1`、`e1` 或 CSS selector 执行动作。
- 支持常见表单与点击操作。
- 返回统一、可序列化的结果对象，便于宿主协议转发。

## 非目标

- 不负责 AI 助理与宿主网站的通讯协议。
- 不打开或控制其他网页。
- 不实现 CDP、Playwright、Puppeteer 或浏览器扩展能力。
- 不承诺生成与浏览器真实 accessibility tree 完全一致的快照。
- 不控制跨域 iframe 内部 DOM。
- 不处理 canvas、WebGL、PDF、视频流等非 DOM 内容。

## 推荐方案

采用“当前页面 DOM 操作内核”架构。库暴露命令式 API，内部按模块划分为快照、引用注册、定位、动作、等待和策略控制。

推荐原因：

- 与宿主现有通讯协议解耦。
- 浏览器端可直接运行，无需 daemon 或原生依赖。
- 与参考项目的用户心智一致，AI 可以先 `snapshot()` 再 `click("@e1")`。
- MVP 范围清晰，后续可逐步增加 locator 和 policy。

## 架构

```text
宿主网站
  │
  │ 调用 JS API
  ▼
AgentDom facade
  ├─ SnapshotEngine
  ├─ RefRegistry
  ├─ Locator
  ├─ ActionEngine
  ├─ WaitEngine
  └─ SafetyPolicy
```

### AgentDom facade

对宿主暴露稳定 API，隐藏内部模块细节。

职责：

- 初始化配置。
- 转发 API 调用到内部模块。
- 标准化返回值和错误。
- 管理一次 `snapshot()` 生成的 ref 生命周期。

建议 API：

```ts
type AgentDomResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; error: string; detail?: unknown };

interface AgentDom {
  snapshot(options?: SnapshotOptions): AgentDomResult<SnapshotResult>;
  click(target: string, options?: ClickOptions): Promise<AgentDomResult<ActionResult>>;
  fill(target: string, value: string, options?: FillOptions): Promise<AgentDomResult<ActionResult>>;
  focus(target: string): Promise<AgentDomResult<ActionResult>>;
  getText(target?: string): AgentDomResult<string>;
  isVisible(target: string): AgentDomResult<boolean>;
  waitFor(target: string, options?: WaitOptions): Promise<AgentDomResult<ActionResult>>;
}
```

### SnapshotEngine

扫描当前 `document`，生成 AI 可读文本快照和机器可读节点列表。

职责：

- 遍历可访问 DOM。
- 过滤不可见、禁用或无意义节点。
- 识别可交互元素：`button`、`a[href]`、`input`、`textarea`、`select`、`summary`、`[role]`、`[tabindex]`、`[contenteditable]`、带点击处理特征的元素。
- 推导 role、name、value、disabled、checked、placeholder 等信息。
- 输出类似：`- button "提交" [ref=e1]`。

注意：浏览器页面 JS 无法直接调用 `Accessibility.getFullAXTree`，因此快照是 DOM + ARIA 规则的近似表示，而不是真实 AX Tree。

### RefRegistry

维护 `ref -> Element` 映射。

职责：

- 每次 `snapshot()` 时生成新的 ref。
- 支持解析 `@e1`、`e1`、`ref=e1`。
- 操作前校验元素仍在当前 DOM 中。
- 对已失效 ref 返回 `STALE_REF`。

实现建议：

- 内部使用 `Map<string, Element>`。
- ref 在一次页面生命周期内递增。
- 默认每次 `snapshot()` 刷新映射，避免旧 DOM 引用误操作。

### Locator

提供 ref 和 CSS selector 之外的语义定位能力。

MVP 可先内置但不必全部对外暴露：

- `getByRole(role, { name })`
- `getByText(text)`
- `getByLabel(label)`
- `getByPlaceholder(text)`
- `getByTestId(id)`

定位顺序建议：

1. ref：`@e1`、`e1`、`ref=e1`。
2. CSS selector。
3. 语义 locator 对象，后续版本扩展。

### ActionEngine

执行 DOM 操作。

职责：

- 操作前滚动元素到视口。
- 校验元素可见、可用、未被策略禁止。
- 执行动作并派发必要事件。
- 返回动作结果。

MVP 动作：

- `click(target)`：调用 `HTMLElement.click()`，必要时先 `focus()`。
- `fill(target, value)`：支持 `input`、`textarea`、`contenteditable`，兼容 React/Vue。
- `focus(target)`：聚焦元素。
- `getText(target?)`：读取目标或页面文本。
- `isVisible(target)`：判断布局可见性。
- `waitFor(target, options)`：等待元素出现、可见或文本出现。

`fill()` 兼容建议：

- 对 `input` 和 `textarea` 使用原生 value setter。
- 派发 `input` 和 `change` 事件，事件设置 `bubbles: true`。
- 对 `contenteditable` 修改 `textContent` 后派发 `input`。

### WaitEngine

提供异步等待能力。

MVP 支持：

- 等待 selector/ref 可解析。
- 等待元素可见。
- 等待页面包含文本。
- 超时返回 `TIMEOUT`。

实现建议：

- 优先用 `MutationObserver`。
- 辅以短间隔轮询，覆盖样式变化和布局变化。

### SafetyPolicy

控制可操作范围，避免 AI 误操作敏感区域。

建议能力：

- `allowSelectors`：只允许操作指定容器内的 DOM。
- `denySelectors`：禁止操作指定元素。
- `maskSensitiveValues`：快照中隐藏 password、token、验证码等字段值。
- `readOnly`：只允许 `snapshot`、`getText`、`isVisible`。
- `beforeAction` hook：宿主可在动作前二次确认。

## 数据流

### 快照流程

1. 宿主调用 `agentDom.snapshot()`。
2. `SnapshotEngine` 扫描 DOM，生成节点描述。
3. `RefRegistry` 为可操作节点分配 ref。
4. `SnapshotEngine` 渲染文本树。
5. 返回 `{ text, nodes }`。

### 动作流程

1. 宿主调用 `agentDom.click("@e1")`。
2. `Locator` 解析目标。
3. `RefRegistry` 返回元素或报告 ref 失效。
4. `SafetyPolicy` 校验是否允许操作。
5. `ActionEngine` 滚动、校验并执行动作。
6. 返回结构化结果。

## 错误处理

统一错误格式：

```ts
type AgentDomErrorCode =
  | "ELEMENT_NOT_FOUND"
  | "STALE_REF"
  | "NOT_VISIBLE"
  | "DISABLED"
  | "UNSUPPORTED_ELEMENT"
  | "POLICY_BLOCKED"
  | "TIMEOUT"
  | "ACTION_FAILED";
```

错误处理原则：

- 不抛出裸异常给宿主，统一返回 `AgentDomResult`。
- `detail` 中可放调试信息，但默认不包含敏感字段值。
- 操作前失败和操作中失败应区分错误码。

## MVP 范围

第一阶段建议实现：

- `createAgentDom(options)`。
- `snapshot()`。
- `click(target)`。
- `fill(target, value)`。
- `focus(target)`。
- `getText(target?)`。
- `isVisible(target)`。
- `waitFor(target, options)`。
- 基础 `SafetyPolicy`：`root`、`allowSelectors`、`denySelectors`、敏感值屏蔽。

暂缓实现：

- 复杂拖拽。
- 文件上传。
- 截图。
- 跨域 iframe。
- 完整 ARIA accessible name 算法。
- LLM tools schema 导出。

## 风险与限制

- 真实用户输入模拟有限：页面 JS 无法完全等价于浏览器底层输入事件。
- 框架兼容需要测试：React、Vue、Angular 对表单事件的监听方式不同。
- 虚拟列表只存在部分 DOM，快照只能看到当前已渲染节点。
- Shadow DOM 需要配置是否递归进入 open shadow root，closed shadow root 无法访问。
- canvas 等非 DOM UI 无法通过普通 DOM API 操作。
- 页面自身安全策略可能阻止某些脚本行为。

## 测试策略

建议使用浏览器环境测试，而不是纯 Node DOM 模拟。

测试层级：

- 单元测试：role/name 推导、ref 解析、错误格式、可见性判断。
- 组件页测试：button、input、textarea、select、checkbox、label、contenteditable。
- 框架兼容测试：至少覆盖 React input value setter 与 `input/change` 事件。
- 端到端测试：在真实浏览器中执行 `snapshot -> click/fill -> assert DOM state`。

## 结论

该项目可行，且适合以小型浏览器端 JS 库实现。核心价值不在复刻 `agent-browser` 的 CDP 能力，而在提供一个 AI 友好的 DOM 语义层：稳定快照、短 ref、常用动作、结构化错误和安全策略。

建议先实现 MVP，再根据宿主 AI 助理的真实调用日志补充 locator、更多动作和兼容性策略。
