import type { SnapshotNode } from '../types';

/** 快照中内联渲染的虚拟子节点（如下拉选项） */
export interface FrameworkSnapshotChild {
  /** ref 标识（格式如 "e16-1"），由 adapter 生成 */
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
   * 例如 AntD 的 dropdown option 需要 `.ant-select-item-option`。
   */
  snapshotSelectors?: string[];

  /**
   * 对元素进行框架专属的 SnapshotNode 属性覆盖/增强。
   * 在核心 describeElement 之后调用，返回值通过 Object.assign 合并。
   *
   * adapter 应自行判断是否需要覆盖（例如只在没有原生 placeholder 时才返回占位符）。
   *
   * @param element 当前快照元素
   * @returns 需要覆盖/增强的 SnapshotNode 属性，或 null 表示无需处理
   */
  describeElement?(element: Element): Partial<SnapshotNode> | null;

  /**
   * 当快照发现此 adapter 识别的元素时（如已展开的下拉选择器），
   * 返回需要内联渲染的虚拟子节点（如下拉选项）。
   *
   * @param element 当前快照元素
   * @param parentRef 父元素的 ref 标识
   * @returns 虚拟子节点列表，或空数组
   */
  getInlineChildren?(element: Element, parentRef: string): FrameworkSnapshotChild[];

  /**
   * 在点击前重定向点击目标到组件内更合适的元素。
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
