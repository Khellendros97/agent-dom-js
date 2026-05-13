# Web Test Fixtures

该目录包含 Agent DOM JS 的手动和自动化测试页面。

- `static-html/`：无构建依赖的原生 HTML 页面。
- `vue3/`：Vue 3 场景页面。
- `react/`：React 场景页面。

三个场景都应覆盖表单、按钮、表格、状态文本和常见可交互元素。

## Manual Run

Static HTML:

Open `web-test/static-html/index.html` directly in a browser.

Vue 3:

```bash
cd web-test/vue3
pnpm install
pnpm dev
```

React:

```bash
cd web-test/react
pnpm install
pnpm dev
```
