import { describe, expect, it, vi } from 'vitest';
import { ztreeAdapter } from '../../src/frameworks/ztree';
import { clickElement } from '../../src/actions';
import { createSnapshot } from '../../src/snapshot';
import { RefRegistry } from '../../src/ref-registry';

/**
 * 构造 zTree 风格的 DOM 结构。
 *
 * 关键特征：
 * - `<li>` 嵌套在 `<div class="ztree">` 内（无外层 `<ul>` 包裹根节点）
 * - 每层 `<li>` 有 `tabindex="0"`
 * - 点击事件通过委托绑定在 `<a[treenode_a]>` 上
 * - 选中时 `<a>` 添加 `curSelectedNode` class
 */
function buildZtreeDom(): void {
  document.body.innerHTML = `
    <div class="ztree" id="treeDemo">
      <li id="node_1" class="level0" tabindex="0" treenode="">
        <span class="button switch noline_open"></span>
        <a id="node_1_a" treenode_a="" title="/">
          <span class="ico_open"></span>
          <span>/(ID:1)</span>
        </a>
        <ul class="level0">
          <li id="node_2" class="level1" tabindex="0" treenode="">
            <span class="button switch noline_docu"></span>
            <a id="node_2_a" class="curSelectedNode" treenode_a="" title="用户组A">
              <span class="ico_docu"></span>
              <span>用户组A(ID:2)</span>
            </a>
          </li>
          <li id="node_3" class="level1" tabindex="0" treenode="">
            <span class="button switch noline_docu"></span>
            <a id="node_3_a" treenode_a="" title="用户组B">
              <span class="ico_docu"></span>
              <span>用户组B(ID:3)</span>
            </a>
          </li>
        </ul>
      </li>
    </div>
  `;
}

describe('ztreeAdapter', () => {
  describe('normalizeClickTarget', () => {
    it('redirects click from ztree <li> to inner <a[treenode_a]>', () => {
      buildZtreeDom();
      const li = document.getElementById('node_2')!;
      expect(li.tagName).toBe('LI');
      expect(li.closest('.ztree')).not.toBeNull();

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      expect(result).toBeInstanceOf(HTMLElement);
      expect((result as HTMLElement).tagName).toBe('A');
      expect((result as HTMLElement).getAttribute('treenode_a')).toBe('');
    });

    it('returns null for non-ztree <li>', () => {
      document.body.innerHTML = '<ul><li tabindex="0"><a href="#">菜单</a></li></ul>';
      const li = document.querySelector('li')!;
      li.setAttribute('tabindex', '0');

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      expect(result).toBeNull();
    });

    it('returns null for non-li elements', () => {
      document.body.innerHTML = '<button class="ztree">按钮</button>';
      const btn = document.querySelector('button')!;

      const result = ztreeAdapter.normalizeClickTarget?.(btn);
      expect(result).toBeNull();
    });
  });

  describe('clickElement with ztreeAdapter', () => {
    it('clicking <li> inside .ztree dispatches events on the inner <a>', async () => {
      buildZtreeDom();
      const li = document.getElementById('node_3')!;
      const a = document.getElementById('node_3_a')!;

      const clickSpy = vi.fn();
      a.addEventListener('click', clickSpy);

      const result = await clickElement(li as HTMLElement, '#node_3', [ztreeAdapter]);
      expect(result.ok).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('supports nested ztree <li> click redirection', () => {
      buildZtreeDom();
      // node_2 是嵌套在 <ul> 内的 <li>
      const li = document.getElementById('node_2')!;
      expect(li.closest('.ztree')).not.toBeNull();

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      expect(result).toBeInstanceOf(HTMLElement);
      expect((result as HTMLElement).id).toBe('node_2_a');
    });
  });

  describe('describeElement', () => {
    it('excludes nested ul/ol text from ztree <li> name', () => {
      buildZtreeDom();
      const li = document.getElementById('node_1')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      // 不应包含后代树节点文本 "用户组A"、"用户组B"
      expect(overrides!.name).not.toContain('用户组A');
      expect(overrides!.name).not.toContain('用户组B');
      // 应包含自身文本
      expect(overrides!.name).toContain('/(ID:1)');
    });

    it('marks selected node with ✓ prefix', () => {
      buildZtreeDom();
      // node_2 的 <a> 有 curSelectedNode class
      const li = document.getElementById('node_2')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      expect(overrides!.name).toMatch(/^✓\s/);
      expect(overrides!.name).toContain('用户组A');
    });

    it('does not mark unselected node with ✓ prefix', () => {
      buildZtreeDom();
      // node_3 的 <a> 无 curSelectedNode class
      const li = document.getElementById('node_3')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      expect(overrides!.name).not.toMatch(/^✓\s/);
    });

    it('returns null for non-ztree <li>', () => {
      document.body.innerHTML = '<ul><li tabindex="0">普通列表项</li></ul>';
      const li = document.querySelector('li')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).toBeNull();
    });
  });

  describe('snapshot integration', () => {
    it('snapshot shows correct ztree <li> names and selected state', () => {
      buildZtreeDom();
      const registry = new RefRegistry();

      const snapshot = createSnapshot(document, registry, {}, [ztreeAdapter]);

      const rootLi = snapshot.nodes.find((n) => n.role === 'li' && n.name.includes('/(ID:1)'));
      expect(rootLi).toBeDefined();
      // 根节点不应包含子节点文本
      expect(rootLi!.name).not.toContain('用户组A');
      expect(rootLi!.name).not.toContain('用户组B');

      // 选中节点应有 ✓ 标记
      const selectedLi = snapshot.nodes.find((n) => n.name.startsWith('✓'));
      expect(selectedLi).toBeDefined();
      expect(selectedLi!.name).toContain('用户组A');

      // 未选中节点无 ✓ 标记
      const unselectedLi = snapshot.nodes.find((n) => n.role === 'li' && n.name === '用户组B(ID:3)');
      expect(unselectedLi).toBeDefined();
    });

    it('full text output includes ✓ for selected ztree node', () => {
      buildZtreeDom();
      const registry = new RefRegistry();

      const snapshot = createSnapshot(document, registry, {}, [ztreeAdapter]);

      // 文本输出中应包含选中标记
      expect(snapshot.text).toMatch(/✓.*用户组A/);
      expect(snapshot.text).not.toMatch(/✓.*用户组B/);
    });
  });
});
