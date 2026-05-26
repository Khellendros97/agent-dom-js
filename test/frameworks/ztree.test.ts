import { describe, expect, it, vi } from 'vitest';
import { ztreeAdapter } from '../../src/frameworks/ztree';
import { clickElement } from '../../src/actions';
import { createSnapshot } from '../../src/snapshot';
import { RefRegistry } from '../../src/ref-registry';
import { createAgentDom } from '../../src/agent-dom';
import { getAccessibleName } from '../../src/dom-utils';

/**
 * 构造 zTree 风格的 DOM 结构。
 *
 * 关键特征：
 * - `<li>` 嵌套在 `<div class="ztree">` 内（无外层 `<ul>` 包裹根节点）
 * - 每层 `<li>` 有 `tabindex="0"` 和 `treenode` 属性
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
    it('redirects click from ztree <li[treenode]> to inner <a[treenode_a]>', () => {
      buildZtreeDom();
      const li = document.getElementById('node_2')!;
      expect(li.tagName).toBe('LI');
      expect(li.hasAttribute('treenode')).toBe(true);
      expect(li.closest('.ztree')).not.toBeNull();

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      expect(result).toBeInstanceOf(HTMLElement);
      expect((result as HTMLElement).tagName).toBe('A');
      expect((result as HTMLElement).getAttribute('treenode_a')).toBe('');
    });

    it('returns null for <li> inside .ztree but without treenode attribute', () => {
      document.body.innerHTML = `
        <div class="ztree">
          <li id="no-treenode" tabindex="0"><a href="#">菜单项</a></li>
        </div>
      `;
      const li = document.getElementById('no-treenode')!;
      expect(li.tagName).toBe('LI');
      expect(li.closest('.ztree')).not.toBeNull();
      expect(li.hasAttribute('treenode')).toBe(false);

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      // 无 treenode 属性 → 不是 zTree 节点 → 不重定向
      expect(result).toBeNull();
    });

    it('returns null for <li[treenode]> without <a[treenode_a]> child', () => {
      document.body.innerHTML = `
        <div class="ztree">
          <li id="no-anchor" tabindex="0" treenode="">空节点</li>
        </div>
      `;
      const li = document.getElementById('no-anchor')!;

      const result = ztreeAdapter.normalizeClickTarget?.(li as HTMLElement);
      expect(result).toBeNull();
    });

    it('returns null for non-ztree <li>', () => {
      document.body.innerHTML = '<ul><li tabindex="0"><a href="#">菜单</a></li></ul>';
      const li = document.querySelector('li')!;

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
    it('clicking <li[treenode]> dispatches events on the inner <a[treenode_a]>', async () => {
      buildZtreeDom();
      const li = document.getElementById('node_3')!;
      const anchor = document.getElementById('node_3_a')!;

      const clickSpy = vi.fn();
      anchor.addEventListener('click', clickSpy);

      const result = await clickElement(li as HTMLElement, '#node_3', [ztreeAdapter]);
      expect(result.ok).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('supports nested ztree <li[treenode]> click redirection', () => {
      buildZtreeDom();
      const li = document.getElementById('node_2')!;

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
      expect(overrides!.name).not.toContain('用户组A');
      expect(overrides!.name).not.toContain('用户组B');
      expect(overrides!.name).toContain('/(ID:1)');
    });

    it('marks selected node (a[treenode_a].curSelectedNode) with ✓ prefix', () => {
      buildZtreeDom();
      const li = document.getElementById('node_2')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      expect(overrides!.name).toMatch(/^✓\s/);
      expect(overrides!.name).toContain('用户组A');
    });

    it('does not mark unselected node with ✓ prefix', () => {
      buildZtreeDom();
      const li = document.getElementById('node_3')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      expect(overrides!.name).not.toMatch(/^✓\s/);
    });

    it('does not falsely mark nodes with "inactive" or "unselected" classes', () => {
      document.body.innerHTML = `
        <div class="ztree">
          <li id="fake" tabindex="0" treenode="">
            <a treenode_a="" class="inactive">未被选中</a>
          </li>
        </div>
      `;
      const li = document.getElementById('fake')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).not.toBeNull();
      // inactive class 不应被误判为选中
      expect(overrides!.name).not.toMatch(/^✓\s/);
    });

    it('returns null for non-ztree <li>', () => {
      document.body.innerHTML = '<ul><li tabindex="0">普通列表项</li></ul>';
      const li = document.querySelector('li')!;

      const overrides = ztreeAdapter.describeElement?.(li);
      expect(overrides).toBeNull();
    });
  });

  describe('snapshot integration with adapter only', () => {
    it('snapshot shows correct ztree <li> names and selected state', () => {
      buildZtreeDom();
      const registry = new RefRegistry();

      const snapshot = createSnapshot(document, registry, {}, [ztreeAdapter]);

      const rootLi = snapshot.nodes.find((n) => n.role === 'li' && n.name.includes('/(ID:1)'));
      expect(rootLi).toBeDefined();
      expect(rootLi!.name).not.toContain('用户组A');
      expect(rootLi!.name).not.toContain('用户组B');

      const selectedLi = snapshot.nodes.find((n) => n.name.startsWith('✓'));
      expect(selectedLi).toBeDefined();
      expect(selectedLi!.name).toContain('用户组A');

      const unselectedLi = snapshot.nodes.find((n) => n.role === 'li' && n.name === '用户组B(ID:3)');
      expect(unselectedLi).toBeDefined();
    });

    it('full text output includes ✓ for selected ztree node', () => {
      buildZtreeDom();
      const registry = new RefRegistry();

      const snapshot = createSnapshot(document, registry, {}, [ztreeAdapter]);

      expect(snapshot.text).toMatch(/✓.*用户组A/);
      expect(snapshot.text).not.toMatch(/✓.*用户组B/);
    });
  });

  describe('createAgentDom integration (default adapters)', () => {
    it('snapshot with default adapters shows correct ztree names', () => {
      buildZtreeDom();
      const agentDom = createAgentDom();

      const result = agentDom.snapshot();
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error);

      // 根节点不应包含子节点文本
      expect(result.data.text).toContain('/(ID:1)');
      expect(result.data.text).toMatch(/✓.*用户组A/);

      // 验证 snapshot nodes 中选中有标记、未选无标记
      const selectedNode = result.data.nodes.find((n) => n.name.startsWith('✓'));
      expect(selectedNode).toBeDefined();
    });

    it('click <li[treenode]> via ref dispatches on <a[treenode_a]> (via default adapters)', async () => {
      buildZtreeDom();
      const anchor = document.getElementById('node_3_a')!;
      const clickSpy = vi.fn();
      anchor.addEventListener('click', clickSpy);

      const agentDom = createAgentDom();
      // 先 snapshot 获取 ref
      const snap = agentDom.snapshot();
      expect(snap.ok).toBe(true);

      // 找到 node_3 对应的 ref
      if (!snap.ok) throw new Error('snapshot failed');
      const node3Li = snap.data.nodes.find(
        (n) => n.role === 'li' && n.name === '用户组B(ID:3)',
      );
      expect(node3Li).toBeDefined();

      // 点击
      const result = await agentDom.click(`@${node3Li!.ref}`);
      expect(result.ok).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAccessibleName for non-ztree nested <li>', () => {
    it('excludes nested ul/ol text from non-ztree <li> accessible name', () => {
      document.body.innerHTML = `
        <li id="outer" tabindex="0">
          <span>分组标题</span>
          <ul>
            <li tabindex="0">子项A</li>
            <li tabindex="0">子项B</li>
          </ul>
        </li>
      `;
      const li = document.getElementById('outer')!;
      const name = getAccessibleName(li);

      // 通用 LI 修复：不应包含嵌套子项文本
      expect(name).not.toContain('子项A');
      expect(name).not.toContain('子项B');
      expect(name).toContain('分组标题');
    });

    it('leaf <li> without nested lists returns its own text unchanged', () => {
      document.body.innerHTML = '<li tabindex="0">普通列表项</li>';
      const li = document.querySelector('li')!;
      const name = getAccessibleName(li);

      expect(name).toBe('普通列表项');
    });
  });
});
