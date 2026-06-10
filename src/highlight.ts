import { isElementVisible } from './dom-utils';
import { failure, success } from './result';
import type { AgentDomResult, HighlightOptions } from './types';

export interface HighlightHandle {
  cleanup(): void;
}

const DEFAULT_MASK_Z_INDEX = 10;
const MASK_ATTR = 'data-agent-dom-highlight-mask';
const BORDER_ATTR = 'data-agent-dom-highlight-border';
const STYLE_ATTR = 'data-agent-dom-highlight-style';

export function highlightElement(
  element: Element,
  options: HighlightOptions = {},
): AgentDomResult<HighlightHandle> {
  const win = element.ownerDocument.defaultView;
  const HTMLElementCtor = win?.HTMLElement ?? HTMLElement;
  if (!(element instanceof HTMLElementCtor)) {
    return failure('UNSUPPORTED_ELEMENT', 'Target is not an HTMLElement');
  }
  if (!isElementVisible(element)) {
    return failure('NOT_VISIBLE', 'Target is not visible');
  }

  const createdNodes: HTMLElement[] = [];
  let targetClickListener: ((event: MouseEvent) => void) | null = null;

  const cleanup = (): void => {
    for (const node of createdNodes) node.remove();
    if (targetClickListener) {
      element.removeEventListener('click', targetClickListener, true);
      targetClickListener = null;
    }
  };

  try {
    element.scrollIntoView({ block: 'center', inline: 'center' });

    const rect = element.getBoundingClientRect();
    const maskZIndex = options.maskZIndex ?? DEFAULT_MASK_Z_INDEX;
    const borderZIndex = maskZIndex + 1;
    const doc = element.ownerDocument;
    const vw = win?.innerWidth ?? 0;
    const vh = win?.innerHeight ?? 0;
    const clampedLeft = Math.max(0, Math.min(rect.left, vw));
    const clampedRight = Math.max(0, Math.min(rect.right, vw));
    const clampedTop = Math.max(0, Math.min(rect.top, vh));
    const clampedBottom = Math.max(0, Math.min(rect.bottom, vh));
    const clampedRect = new DOMRect(
      clampedLeft,
      clampedTop,
      Math.max(0, clampedRight - clampedLeft),
      Math.max(0, clampedBottom - clampedTop),
    );
    const mount = doc.body ?? doc.documentElement;
    const masks = createMasks(doc, clampedRect, vw, vh, maskZIndex);
    const border = createBorder(doc, clampedRect, borderZIndex);
    const style = createStyle(doc);

    createdNodes.push(...masks, border, style);

    const closeOnMaskClick = (): void => cleanup();
    for (const mask of masks) {
      mask.addEventListener('click', closeOnMaskClick, { once: true });
    }

    targetClickListener = () => cleanup();
    element.addEventListener('click', targetClickListener, true);

    mount.append(...createdNodes);
  } catch (error) {
    cleanup();
    return failure('ACTION_FAILED', 'Highlight failed', error);
  }

  return success({ cleanup });
}

function createMasks(doc: Document, rect: DOMRect, vw: number, vh: number, zIndex: number): HTMLElement[] {
  const top = createMask(doc, zIndex, {
    top: '0px',
    left: '0px',
    width: `${vw}px`,
    height: `${Math.max(0, rect.top)}px`,
  });
  const right = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.top)}px`,
    left: `${Math.max(0, rect.right)}px`,
    width: `${Math.max(0, vw - rect.right)}px`,
    height: `${Math.max(0, rect.height)}px`,
  });
  const bottom = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.bottom)}px`,
    left: '0px',
    width: `${vw}px`,
    height: `${Math.max(0, vh - rect.bottom)}px`,
  });
  const left = createMask(doc, zIndex, {
    top: `${Math.max(0, rect.top)}px`,
    left: '0px',
    width: `${Math.max(0, rect.left)}px`,
    height: `${Math.max(0, rect.height)}px`,
  });

  return [top, right, bottom, left];
}

function createMask(
  doc: Document,
  zIndex: number,
  box: Pick<CSSStyleDeclaration, 'top' | 'left' | 'width' | 'height'>,
): HTMLElement {
  const mask = doc.createElement('div');
  mask.setAttribute(MASK_ATTR, 'true');
  Object.assign(mask.style, {
    position: 'fixed',
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    background: 'rgba(0, 0, 0, 0.55)',
    zIndex: String(zIndex),
    pointerEvents: 'auto',
  });
  return mask;
}

function createBorder(doc: Document, rect: DOMRect, zIndex: number): HTMLElement {
  const border = doc.createElement('div');
  border.setAttribute(BORDER_ATTR, 'true');
  Object.assign(border.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: 'border-box',
    border: '3px solid transparent',
    borderRadius: '4px',
    animation: 'agent-dom-highlight-rgb 1.2s linear infinite',
    zIndex: String(zIndex),
    pointerEvents: 'none',
  });
  return border;
}

function createStyle(doc: Document): HTMLElement {
  const style = doc.createElement('style');
  style.setAttribute(STYLE_ATTR, 'true');
  style.textContent = `
@keyframes agent-dom-highlight-rgb {
  0% { border-color: rgb(255, 0, 0); box-shadow: 0 0 8px rgb(255, 0, 0); }
  33% { border-color: rgb(0, 255, 0); box-shadow: 0 0 8px rgb(0, 255, 0); }
  66% { border-color: rgb(0, 128, 255); box-shadow: 0 0 8px rgb(0, 128, 255); }
  100% { border-color: rgb(255, 0, 0); box-shadow: 0 0 8px rgb(255, 0, 0); }
}`;
  return style;
}
