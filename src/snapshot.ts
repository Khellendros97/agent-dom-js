import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from './dom-utils';
import { isAllowedByPolicy } from './policy';
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
  options: Pick<AgentDomOptions, 'maskSensitiveValues' | 'allowSelectors' | 'denySelectors'> = {},
): SnapshotResult {
  registry.clear();

  const lines: string[] = [];
  const nodes: SnapshotNode[] = [];
  const scope = root instanceof Document ? root.body : root;

  collectHeadings(scope, lines, options);
  collectTables(scope, lines, options);
  collectLists(scope, lines, options);

  scope.querySelectorAll(INTERACTIVE_SELECTOR).forEach((element) => {
    if (!isElementVisible(element)) return;
    if (!isAllowedByPolicy(element, options)) return;

    const ref = registry.register(element);
    const node = describeElement(element, ref, options.maskSensitiveValues ?? true);
    nodes.push(node);
    lines.push(renderNode(node));
  });

  return { text: lines.join('\n'), nodes };
}

function collectHeadings(
  root: ParentNode,
  lines: string[],
  options: Pick<AgentDomOptions, 'allowSelectors' | 'denySelectors'>,
): void {
  root.querySelectorAll('h1,h2,h3').forEach((heading) => {
    if (!isElementVisible(heading)) return;
    if (!isAllowedByPolicy(heading, options)) return;
    const name = heading.textContent?.replace(/\s+/g, ' ').trim();
    if (name) lines.push(`- heading "${escapeText(name)}"`);
  });
}

function collectTables(
  root: ParentNode,
  lines: string[],
  options: Pick<AgentDomOptions, 'allowSelectors' | 'denySelectors'>,
): void {
  root.querySelectorAll('table').forEach((table) => {
    if (!isElementVisible(table)) return;
    if (!isAllowedByPolicy(table, options)) return;

    const caption = table.querySelector('caption')?.textContent?.trim();
    const rows = table.querySelectorAll('tr');
    const headerCells = rows[0]?.querySelectorAll('th');
    const headerTexts = headerCells?.length
      ? Array.from(headerCells).map((th) => th.textContent?.trim() ?? '')
      : null;

    const bodyRows: string[] = [];
    let rowCount = 0;
    rows.forEach((row, idx) => {
      if (headerTexts && idx === 0 && row.querySelector('th')) return; // skip header row
      const cells = row.querySelectorAll('td');
      if (!cells.length) return;
      rowCount++;
      const values = Array.from(cells).map((td) => td.textContent?.trim() ?? '');
      bodyRows.push(`  | ${values.join(' | ')} |`);
    });

    const label = caption || (table.closest('[aria-labelledby]')
      ? document.getElementById(table.closest('[aria-labelledby]')!.getAttribute('aria-labelledby')!)?.textContent?.trim()
      : '') || '';
    const header = headerTexts ? `\n  | ${headerTexts.join(' | ')} |` : '';
    lines.push(`- table${label ? ` "${escapeText(label)}"` : ''} [${rowCount} rows]${header}${bodyRows.length ? '\n' + bodyRows.join('\n') : ''}`);
  });
}

function collectLists(
  root: ParentNode,
  lines: string[],
  options: Pick<AgentDomOptions, 'allowSelectors' | 'denySelectors'>,
): void {
  root.querySelectorAll('ul,ol').forEach((list) => {
    if (!isElementVisible(list)) return;
    if (!isAllowedByPolicy(list, options)) return;

    const items: string[] = [];
    list.querySelectorAll(':scope > li').forEach((li) => {
      const text = li.textContent?.replace(/\s+/g, ' ').trim();
      if (text) items.push(text);
    });

    if (items.length) {
      const tag = list.tagName.toLowerCase();
      lines.push(`- ${tag} [${items.length} items]${items.map((t) => `\n  - "${escapeText(t)}"`).join('')}`);
    }
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

  if (element instanceof HTMLAnchorElement && element.href) {
    node.href = element.href;
  }

  if (element instanceof HTMLInputElement) {
    node.inputType = element.type;
    node.placeholder = element.placeholder || undefined;
  }

  if (element instanceof HTMLTextAreaElement) {
    node.placeholder = element.placeholder || undefined;
  }

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
    node.options = Array.from(element.options).map((opt) => opt.textContent?.trim() ?? opt.value);
  }

  if (element instanceof HTMLButtonElement) {
    node.disabled = node.disabled || element.disabled;
  }

  return node;
}

function renderNode(node: SnapshotNode): string {
  const attrs = [`ref=${node.ref}`];
  if (node.inputType && node.inputType !== 'text') attrs.push(`type=${node.inputType}`);
  if (node.placeholder) attrs.push(`placeholder="${escapeText(node.placeholder)}"`);
  if (node.value) attrs.push(`value="${escapeText(node.value)}"`);
  if (node.href) attrs.push(`href="${escapeText(node.href)}"`);
  if (node.options?.length) attrs.push(`options=[${node.options.map((o) => `"${escapeText(o)}"`).join(', ')}]`);
  if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
  if (node.disabled) attrs.push('disabled=true');

  return `- ${node.role} "${escapeText(node.name)}" [${attrs.join(', ')}]`;
}

function escapeText(value: string): string {
  return value.replace(/"/g, '\\"');
}
