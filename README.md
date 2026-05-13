# agent-dom-js

Browser-side DOM operation library for embedded AI assistants.

## Basic Usage

```ts
import { createAgentDom } from 'agent-dom-js';

const agentDom = createAgentDom();

const snapshot = agentDom.snapshot();
await agentDom.click('@e1');
await agentDom.fill('#email', 'user@example.com');
```

## Scope

This library operates only on the current page DOM that the host page can access. It does not control other websites, browser tabs, network traffic, screenshots, PDFs, or cross-origin iframes.
