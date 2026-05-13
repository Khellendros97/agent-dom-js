import { getAccessibleName, getRole, isElementVisible, isSensitiveElement } from './dom-utils';
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
  options: Pick<AgentDomOptions, 'maskSensitiveValues'> = {},
): SnapshotResult {
  registry.clear();

  const lines: string[] = [];
  const nodes: SnapshotNode[] = [];
  const scope = root instanceof Document ? root.body : root;

  collectHeadings(scope, lines);

  scope.querySelectorAll(INTERACTIVE_SELECTOR).forEach((element) => {
    if (!isElementVisible(element)) return;

    const ref = registry.register(element);
    const node = describeElement(element, ref, options.maskSensitiveValues ?? true);
    nodes.push(node);
    lines.push(renderNode(node));
  });

  return { text: lines.join('\n'), nodes };
}

function collectHeadings(root: ParentNode, lines: string[]): void {
  root.querySelectorAll('h1,h2,h3').forEach((heading) => {
    if (!isElementVisible(heading)) return;
    const name = heading.textContent?.replace(/\s+/g, ' ').trim();
    if (name) lines.push(`- heading "${escapeText(name)}"`);
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
  }

  return node;
}

function renderNode(node: SnapshotNode): string {
  const attrs = [`ref=${node.ref}`];
  if (node.value) attrs.push(`value="${escapeText(node.value)}"`);
  if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
  if (node.disabled) attrs.push('disabled=true');

  return `- ${node.role} "${escapeText(node.name)}" [${attrs.join(', ')}]`;
}

function escapeText(value: string): string {
  return value.replace(/"/g, '\\"');
}
