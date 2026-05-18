import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from './dom-utils';
import { isAllowedByPolicy } from './policy';
import type { RefRegistry } from './ref-registry';
import type { AgentDomOptions, SnapshotNode, SnapshotResult } from './types';

const SNAPSHOT_SELECTOR = [
  'h1', 'h2', 'h3',
  'table',
  'ul', 'ol',
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
  options: Pick<AgentDomOptions, 'maskSensitiveValues' | 'allowSelectors' | 'denySelectors'> = {},
): SnapshotResult {
  registry.clear();

  const lines: string[] = [];
  const nodes: SnapshotNode[] = [];
  const scope = root instanceof Document ? root.body : root;
  const seenOptions = new Set<Element>();

  scope.querySelectorAll(SNAPSHOT_SELECTOR).forEach((element) => {
    if (!isElementVisible(element)) return;
    if (!isAllowedByPolicy(element, options)) return;

    const tag = element.tagName.toLowerCase();

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

    // Interactive element
    const ref = registry.register(element);
    const node = describeElement(element, ref, options.maskSensitiveValues ?? true);
    nodes.push(node);
    let line = renderNode(node);
    if (node.role === 'combobox' && element instanceof HTMLInputElement && element.closest('.ant-select')) {
      line += ' # click to get options';
    }
    lines.push(line);

    // Ant Design Select: render child dropdown options inline
    if (element instanceof HTMLInputElement && element.closest('.ant-select')) {
      const listId = element.getAttribute('aria-owns');
      const selector = listId
        ? `#${CSS.escape(listId)} .ant-select-item-option`
        : '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option';
      document.querySelectorAll(selector).forEach((opt) => {
        if (!isElementVisible(opt)) return;
        if (seenOptions.has(opt)) return;
        seenOptions.add(opt);
        const childRef = `${ref}-${seenOptions.size}`;
        registry.registerChild(childRef, opt);
        const childNode: SnapshotNode = {
          ref: childRef,
          role: 'option',
          name: opt.querySelector('.ant-select-item-option-content')?.textContent?.trim() || opt.getAttribute('title') || '',
          tagName: 'div',
        };
        nodes.push(childNode);
        lines.push(`  ${renderNode(childNode)}`);
      });
    }
  });

  return { text: lines.join('\n'), nodes };
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

  if (element instanceof HTMLAnchorElement && element.href) {
    node.href = element.href;
  }

  if (element instanceof HTMLInputElement) {
    node.inputType = element.type;
    node.placeholder = element.placeholder || getAntdPlaceholder(element) || undefined;
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

  // Ant Design Select: value is on .ant-select-content via title or textContent
  if (element instanceof HTMLInputElement && element.closest('.ant-select')) {
    const selectRoot = element.closest('.ant-select')!;
    const content = selectRoot.querySelector('.ant-select-content');
    if (content) {
      const selected = content.getAttribute('title')?.trim() || content.textContent?.replace(element.value, '').trim() || undefined;
      if (selected) node.value = selected;
    }
  }

  // Ant Design dropdown option items
  if (element.matches('.ant-select-item-option')) {
    node.role = 'option';
    node.name = element.querySelector('.ant-select-item-option-content')?.textContent?.trim() || element.getAttribute('title') || node.name;
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

function captureValidation(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  node: SnapshotNode,
): void {
  if (!element.willValidate) return;
  if (element.validity.valid) return;
  node.validationMessage = element.validationMessage;
}

function renderNode(node: SnapshotNode): string {
  const attrs = [`ref=${node.ref}`];
  if (node.inputType && node.inputType !== 'text') attrs.push(`type=${node.inputType}`);
  if (node.placeholder) attrs.push(`placeholder="${escapeText(node.placeholder)}"`);
  if (node.value) attrs.push(`value="${escapeText(node.value)}"`);
  if (node.href) attrs.push(`href="${escapeText(node.href)}"`);
  if (node.options?.length) attrs.push(`options=[${node.options.map((o) => `"${escapeText(o)}"`).join(', ')}]`);
  if (node.required) attrs.push('required=true');
  if (node.validationMessage) attrs.push(`validation="${escapeText(node.validationMessage)}"`);
  if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
  if (node.disabled) attrs.push('disabled=true');

  return `- ${node.role} "${escapeText(node.name)}" [${attrs.join(', ')}]`;
}

function escapeText(value: string): string {
  return value.replace(/"/g, '\\"');
}

function safeValue(element: { value: unknown }): string {
  const v = element.value;
  return typeof v === 'string' ? v : (v != null ? String(v) : '');
}

function getAntdPlaceholder(element: Element): string | null {
  const selectRoot = element.closest('.ant-select');
  if (!selectRoot) return null;
  return selectRoot.querySelector('.ant-select-selection-placeholder')?.textContent?.trim()
    || selectRoot.querySelector('.ant-select-placeholder')?.textContent?.trim()
    || null;
}
