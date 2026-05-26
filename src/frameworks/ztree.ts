import type { FrameworkAdapter } from './types';
import type { SnapshotNode } from '../types';

/**
 * zTree (jQuery tree plugin) 适配器。
 *
 * 问题背景：
 * - zTree 将 `<li>` 嵌套在 `.ztree` 容器内，每层 `<li>` 带 `tabindex="0"`，
 *   agent-dom 快照中 `<li>` 被捕获为交互元素。
 * - zTree 的点击事件委托仅绑定在 `<a[treenode_a]>` 上，不响应 `<li>` 的直接点击。
 * - zTree 选中节点时给 `<a>` 添加 `curSelectedNode` class。
 *
 * 适配器处理：
 * 1. normalizeClickTarget — `<li>` 点击重定向到内部 `<a[treenode_a]>`
 * 2. describeElement   — 修复 `<li>` 的 name（排除嵌套 ul/ol 文本），标记选中状态
 */
export const ztreeAdapter: FrameworkAdapter = {
  name: 'ztree',

  describeElement(element: Element): Partial<SnapshotNode> | null {
    if (element.tagName !== 'LI') return null;
    if (!element.closest('.ztree')) return null;

    const overrides: Partial<SnapshotNode> = {};

    // 修复 name：克隆后删除嵌套 ul/ol，排除后代树节点文本
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('ul, ol').forEach((el) => el.remove());
    const ownName = clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (ownName) {
      overrides.name = ownName;
    }

    // 检测选中状态：zTree 在 <a> 上添加 curSelectedNode class
    const a = element.querySelector(':scope > a');
    if (a && a.classList.contains('curSelectedNode')) {
      overrides.name = '✓ ' + (overrides.name || ownName);
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  },

  normalizeClickTarget(element: HTMLElement): HTMLElement | null {
    // zTree <li> 点击重定向到子 <a[treenode_a]>
    if (element.tagName !== 'LI') return null;
    if (!element.closest('.ztree')) return null;

    const a = element.querySelector(':scope > a[treenode_a]');
    if (a instanceof HTMLElement) return a;
    return null;
  },
};
