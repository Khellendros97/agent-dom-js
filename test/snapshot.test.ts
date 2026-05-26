import { describe, expect, it } from 'vitest';
import { RefRegistry } from '../src/ref-registry';
import { createSnapshot } from '../src/snapshot';

describe('createSnapshot', () => {
  it('renders interactive elements with refs', () => {
    document.body.innerHTML = `
      <main>
        <h1>测试页面</h1>
        <button>提交</button>
        <label for="name">姓名</label><input id="name" value="张三" />
      </main>
    `;
    const registry = new RefRegistry();

    const snapshot = createSnapshot(document, registry, { maskSensitiveValues: true });

    expect(snapshot.text).toContain('- heading "测试页面"');
    expect(snapshot.text).toContain('- button "提交" [ref=e1]');
    expect(snapshot.text).toContain('- textbox "姓名" [ref=e2, value="张三"]');
    expect(snapshot.nodes).toHaveLength(2);
  });

  it('masks sensitive input values', () => {
    document.body.innerHTML = '<label for="password">密码</label><input id="password" type="password" value="secret" />';
    const snapshot = createSnapshot(document, new RefRegistry(), { maskSensitiveValues: true });

    expect(snapshot.text).toContain('value="[masked]"');
    expect(snapshot.text).not.toContain('secret');
  });

  it('excludes denied elements from snapshot', () => {
    document.body.innerHTML = '<button class="safe">安全按钮</button><button class="danger">危险按钮</button>';
    const snapshot = createSnapshot(document, new RefRegistry(), { denySelectors: ['.danger'] });

    expect(snapshot.text).toContain('安全按钮');
    expect(snapshot.text).not.toContain('危险按钮');
    expect(snapshot.nodes).toHaveLength(1);
  });

  it('excludes denied headings from snapshot text', () => {
    document.body.innerHTML = '<h1 class="public">可见标题</h1><h1 class="secret">敏感标题</h1><button>按钮</button>';
    const snapshot = createSnapshot(document, new RefRegistry(), { denySelectors: ['.secret'] });

    expect(snapshot.text).toContain('可见标题');
    expect(snapshot.text).not.toContain('敏感标题');
  });

  it('collects table rows', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>名称</th><th>数量</th></tr></thead>
        <tbody>
          <tr><td>苹果</td><td>3</td></tr>
          <tr><td>香蕉</td><td>5</td></tr>
        </tbody>
      </table>
    `;
    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).toContain('- table [2 rows]');
    expect(snapshot.text).toContain('| 名称 | 数量 |');
    expect(snapshot.text).toContain('| 苹果 | 3 |');
    expect(snapshot.text).toContain('| 香蕉 | 5 |');
  });

  it('collects list items', () => {
    document.body.innerHTML = '<ul><li>选项A</li><li>选项B</li></ul>';
    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).toContain('- ul [2 items]');
    expect(snapshot.text).toContain('"选项A"');
    expect(snapshot.text).toContain('"选项B"');
  });

  it('captures validation errors on invalid fields', () => {
    document.body.innerHTML = `
      <form>
        <input id="email" type="email" value="not-an-email" required />
        <input id="name" type="text" value="" required />
      </form>
    `;
    // Trigger native validation
    const form = document.querySelector('form')!;
    form.reportValidity();
    form.requestSubmit();

    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).toContain('validation=');
    expect(snapshot.nodes.some((n) => n.validationMessage)).toBe(true);
  });

  it('captures paragraph text', () => {
    document.body.innerHTML = '<p>这是一段正文内容</p><p>第二段文本</p>';
    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).toContain('- text "这是一段正文内容"');
    expect(snapshot.text).toContain('- text "第二段文本"');
    // p 标签不分配 ref
    expect(snapshot.nodes).toHaveLength(0);
  });

  it('skips empty paragraphs', () => {
    document.body.innerHTML = '<p>  </p><p></p>';
    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).not.toContain('" "');
    expect(snapshot.text).not.toContain('""');
  });

  it('reports required attribute on fields', () => {
    document.body.innerHTML = '<input type="email" required />';
    const snapshot = createSnapshot(document, new RefRegistry(), {});

    expect(snapshot.text).toContain('required=true');
  });
});
