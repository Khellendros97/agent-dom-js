# Highlight 功能设计

## 目标

为 `AgentDom` 实例增加 `highlight(target, options?)` 方法，用于把目标元素以 RGB 跑马灯边框突出显示，并将目标外的页面区域覆盖黑色半透明遮罩。点击目标元素或遮罩后关闭高亮与遮罩。

## 现状分析

相关代码路径：

- `src/types.ts`：定义 `AgentDom`、`AgentDomResult<T>`、`ActionResult` 等公共类型。
- `src/agent-dom.ts`：`createAgentDom()` 组装实例 API，并通过内部 `resolve(target)` 复用 `resolveTarget`。
- `src/target.ts`：支持 ref 与 CSS selector 解析，并执行 allow/deny policy。
- `src/actions.ts`：承载 `click/fill/focus` 等动作函数，不适合继续混入高亮叠层生命周期。
- `test/agent-dom.test.ts`：适合覆盖实例 API 行为。
- `test/setup.ts`：已有 jsdom polyfill，可继续补充高亮测试所需浏览器 API 兼容。

现有 API 均返回 `AgentDomResult<T>`。`click/fill/focus` 在 `readOnly` 下返回 `POLICY_BLOCKED`，但 `highlight` 是视觉提示能力，本设计明确允许在 `readOnly` 下执行。

## API 设计

新增类型：

```ts
export interface HighlightOptions {
  maskZIndex?: number;
}
```

扩展 `AgentDom`：

```ts
highlight(target: string, options?: HighlightOptions): AgentDomResult<ActionResult>;
```

`maskZIndex` 控制遮罩层级，默认值为 `10`。边框层级使用 `maskZIndex + 1`。

## 架构设计

新增 `src/highlight.ts`，封装高亮 DOM 生命周期：

- 创建四块遮罩节点，分别覆盖目标元素上、右、下、左四个区域，避免遮罩盖住目标元素本身。
- 创建目标边框节点。
- 注入一次性样式节点，使用固定 data 属性标识，cleanup 时同步移除。
- 绑定任意遮罩块点击关闭逻辑。
- 绑定目标元素捕获阶段点击 cleanup，且不阻止目标原点击行为。
- 返回 cleanup 函数，供下一次高亮或用户点击时清理。

`src/agent-dom.ts` 在 `createAgentDom()` 闭包内维护当前 cleanup：

- 每次调用 `highlight` 前先执行旧 cleanup，实现替换。
- 复用内部 `resolve(target)`，保持 ref、selector、policy 行为一致。
- 不检查 `options.readOnly`，保证 readOnly 下仍允许视觉提示。

## 交互与渲染设计

成功解析目标后：

1. 校验目标必须是 `HTMLElement`。
2. 校验目标可见。
3. 调用 `scrollIntoView({ block: 'center', inline: 'center' })`。
4. 基于 `getBoundingClientRect()` 创建固定定位边框节点。
5. 创建四块固定定位遮罩，分别覆盖目标矩形外的上、右、下、左区域。
6. 遮罩背景为黑色半透明，`z-index` 为 `maskZIndex ?? 10`。
7. 目标元素所在矩形区域不被遮罩覆盖，保证目标不变暗且可接收点击。
8. 边框 `z-index` 为遮罩层级加一。
9. 边框显示 RGB 跑马灯动画。

目标点击行为：

- 目标元素保留原有点击行为。
- 高亮逻辑只做 cleanup，不调用 `preventDefault()` 或 `stopPropagation()`。

关闭行为：

- 点击任意遮罩块关闭。
- 点击目标元素关闭。
- 下一次调用 `highlight` 时关闭上一轮高亮。

## 错误处理

- 目标不存在、ref 失效、policy 阻断：直接返回 `resolveTarget` 的失败结果。
- 目标不是 `HTMLElement`：返回 `UNSUPPORTED_ELEMENT`。
- 目标不可见：返回 `NOT_VISIBLE`。
- DOM 操作异常：返回 `ACTION_FAILED`，并清理已创建节点。
- `readOnly` 不阻止 `highlight`。

## 测试设计

新增 `test/highlight.test.ts`：

- 默认 `maskZIndex` 为 `10`。
- 自定义 `maskZIndex` 生效。
- 重复调用会替换旧高亮。
- 点击任意遮罩块会关闭全部遮罩和边框。
- 点击目标元素会关闭高亮，同时保留目标点击监听触发。
- 非 HTMLElement 返回 `UNSUPPORTED_ELEMENT`。
- 不可见元素返回 `NOT_VISIBLE`。
- DOM 操作异常返回 `ACTION_FAILED` 且不残留节点。

更新 `test/agent-dom.test.ts`：

- 实例 API 暴露 `highlight`。
- `readOnly: true` 时仍可执行 `highlight`。
- policy 阻断时返回 `POLICY_BLOCKED`。

## 实施范围

本次只实现单目标高亮。暂不支持多目标同时高亮、可配置遮罩颜色、可配置动画速度、窗口滚动/resize 后自动跟随目标矩形。

## 自检记录

- 阻塞点：无。
- 已确认：API 挂在 `AgentDom` 实例上；`maskZIndex` 可选且默认 `10`；readOnly 下允许执行；多次调用替换旧高亮；目标点击保留原点击行为；目标视口外时自动滚动；遮罩不覆盖目标元素本身。
- 设计修正：全屏遮罩会覆盖目标元素并影响点击，已改为四块遮罩围绕目标元素绘制。
- 低级错误检查：无占位符、无重复段落、无内部矛盾；已将样式注入方式收敛为一次性样式节点。
