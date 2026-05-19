import type { FrameworkAdapter, FrameworkSnapshotChild } from './types';
import type { SnapshotNode } from '../types';

/**
 * Quasar UI 框架适配器。
 *
 * 处理 Quasar 特有组件的 DOM 结构和语义映射。
 *
 * 核心兼容点：
 * - QSelect: 自定义控件（非 <select>），下拉选项在 portal 中渲染
 * - QInput: 原生 input 被 q-field 包装，label 在 .q-field__label
 * - QCheckbox/QToggle: 隐藏原生 input，外观由覆盖层控制
 * - QTable: 使用标准 <table> 结构，但带 quasar 增强
 * - QDialog: portal + focus-trap 模式
 */
export const quasarAdapter: FrameworkAdapter = {
  name: 'quasar',

  // QSelect 下拉选项由 portal 动态渲染，需要显式加入 selector
  snapshotSelectors: [
    '.q-item[role="option"]',
  ],

  describeElement(element: Element): Partial<SnapshotNode> | null {
    const overrides: Partial<SnapshotNode> = {};

    // QSelect option: 覆盖 role 并提取干净的 name
    if (element.matches('.q-item[role="option"]')) {
      overrides.role = 'option';
      overrides.name =
        element.querySelector('.q-item__label')?.textContent?.trim()
        || element.textContent?.trim()
        || '';
    }

    // QSelect input: 提取 placeholder 和 value
    if (element instanceof HTMLInputElement && element.closest('.q-select')) {
      const qSelect = element.closest('.q-select')!;

      // Placeholder: 当无原生 placeholder 时从 label 读取
      if (!element.placeholder) {
        const label = qSelect.querySelector('.q-field__label')?.textContent?.trim();
        if (label) overrides.placeholder = label;
      }

      // Value: 从 .q-field__selected span 读取已选值
      const selectedValue = qSelect.querySelector('.q-field__selected span')?.textContent?.trim();
      if (selectedValue) {
        overrides.value = selectedValue;
      }
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  },

  getInlineChildren(element: Element, parentRef: string): FrameworkSnapshotChild[] {
    if (!(element instanceof HTMLInputElement)) return [];
    if (!element.closest('.q-select')) return [];
    if (element.getAttribute('aria-expanded') !== 'true') return [];

    // QSelect 展开时下拉选项渲染在 body 下的 portal 中
    const qMenu = document.querySelector('.q-menu');
    if (!qMenu) return [];

    const children: FrameworkSnapshotChild[] = [];
    const options = qMenu.querySelectorAll('[role="option"]');
    options.forEach((opt, idx) => {
      children.push({
        ref: `${parentRef}-${idx + 1}`,
        role: 'option',
        name:
          opt.querySelector('.q-item__label')?.textContent?.trim()
          || opt.textContent?.trim()
          || '',
        tagName: 'div',
        element: opt,
      });
    });
    return children;
  },

  normalizeClickTarget(element: HTMLElement): HTMLElement | null {
    // QSelect 的内部 input 不可见，点击应重定向到 field control
    if (element.matches('.q-select__focus-target') && element.closest('.q-select')) {
      const fieldControl = element.closest('.q-field__control');
      if (fieldControl instanceof HTMLElement) return fieldControl;
    }
    return null;
  },

  getElementHint(element: Element): string | null {
    if (element instanceof HTMLInputElement && element.closest('.q-select')) {
      return 'click to get options';
    }
    return null;
  },
};
