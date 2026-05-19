import type { FrameworkAdapter, FrameworkSnapshotChild } from './types';
import type { SnapshotNode } from '../types';

/** 从 AntD Select 组件中提取 placeholder 文本 */
function getAntdPlaceholder(element: Element): string | null {
  const selectRoot = element.closest('.ant-select');
  if (!selectRoot) return null;
  return (
    selectRoot.querySelector('.ant-select-selection-placeholder')?.textContent?.trim()
    || selectRoot.querySelector('.ant-select-placeholder')?.textContent?.trim()
    || null
  );
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
        const selected =
          content.getAttribute('title')?.trim()
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
      '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
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
