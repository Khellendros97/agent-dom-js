import { describe, expect, it, vi, beforeEach } from 'vitest';
import { highlightElement } from '../src/highlight';

beforeEach(() => {
  document.body.innerHTML = '';
});

function appendVisibleButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = '保存';
  document.body.append(button);
  button.getBoundingClientRect = () => ({
    x: 20,
    y: 30,
    left: 20,
    top: 30,
    right: 120,
    bottom: 70,
    width: 100,
    height: 40,
    toJSON: () => ({}),
  });
  return button;
}

function masks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-agent-dom-highlight-mask]'));
}

function border(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-agent-dom-highlight-border]');
}

describe('highlightElement', () => {
  it('creates four mask layers and an animated border with default z-index', () => {
    const button = appendVisibleButton();

    const result = highlightElement(button);

    expect(result.ok).toBe(true);
    expect(masks()).toHaveLength(4);
    expect(masks().every((mask) => mask.style.zIndex === '10')).toBe(true);
    expect(border()?.style.zIndex).toBe('11');
    expect(border()?.style.position).toBe('fixed');
  });

  it('uses custom maskZIndex and keeps border one layer above masks', () => {
    const button = appendVisibleButton();

    const result = highlightElement(button, { maskZIndex: 88 });

    expect(result.ok).toBe(true);
    expect(masks().every((mask) => mask.style.zIndex === '88')).toBe(true);
    expect(border()?.style.zIndex).toBe('89');
  });

  it('cleans all highlight nodes when any mask is clicked', () => {
    const button = appendVisibleButton();
    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    masks()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(masks()).toHaveLength(0);
    expect(border()).toBeNull();
    expect(document.querySelector('[data-agent-dom-highlight-style]')).toBeNull();
  });

  it('cleans highlight on target click while preserving target click behavior', () => {
    const button = appendVisibleButton();
    const listener = vi.fn();
    button.addEventListener('click', listener);
    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(masks()).toHaveLength(0);
    expect(border()).toBeNull();
  });

  it('returns unsupported element for non-HTMLElement targets', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(svg);

    const result = highlightElement(svg);

    expect(result).toMatchObject({ ok: false, code: 'UNSUPPORTED_ELEMENT' });
  });

  it('returns not visible for hidden targets', () => {
    const button = appendVisibleButton();
    button.hidden = true;

    const result = highlightElement(button);

    expect(result).toMatchObject({ ok: false, code: 'NOT_VISIBLE' });
  });

  it('returns action failed and leaves no nodes when mounting throws', () => {
    const button = appendVisibleButton();
    const originalAppend = document.body.append;
    document.body.append = (() => { throw new Error('boom'); }) as typeof document.body.append;

    try {
      const result = highlightElement(button);

      expect(result).toMatchObject({ ok: false, code: 'ACTION_FAILED' });
      expect(masks()).toHaveLength(0);
      expect(border()).toBeNull();
    } finally {
      document.body.append = originalAppend;
    }
  });

  it('calls scrollIntoView on the target element', () => {
    const button = appendVisibleButton();
    const spy = vi.spyOn(button, 'scrollIntoView');

    highlightElement(button);

    expect(spy).toHaveBeenCalledWith({ block: 'center', inline: 'center' });
  });

  it('positions masks around the target rectangle', () => {
    const button = appendVisibleButton();

    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    const allMasks = masks();
    // top mask: covers area above target
    expect(allMasks[0].style.top).toBe('0px');
    expect(allMasks[0].style.height).toBe('30px');
    // right mask: covers area to the right of target
    expect(allMasks[1].style.left).toBe('120px');
    // bottom mask: covers area below target
    expect(allMasks[2].style.top).toBe('70px');
    // left mask: covers area to the left of target
    expect(allMasks[3].style.left).toBe('0px');
    expect(allMasks[3].style.width).toBe('20px');
  });

  it('cleanup is idempotent', () => {
    const button = appendVisibleButton();
    const result = highlightElement(button);
    if (!result.ok) throw new Error(result.error);

    result.data.cleanup();
    result.data.cleanup();

    expect(masks()).toHaveLength(0);
    expect(border()).toBeNull();
  });
});
