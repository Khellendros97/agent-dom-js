export type AgentDomResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AgentDomErrorCode; error: string; detail?: unknown };

export type AgentDomErrorCode =
  | 'ELEMENT_NOT_FOUND'
  | 'STALE_REF'
  | 'NOT_VISIBLE'
  | 'DISABLED'
  | 'UNSUPPORTED_ELEMENT'
  | 'POLICY_BLOCKED'
  | 'TIMEOUT'
  | 'ACTION_FAILED';

export interface AgentDomOptions {
  root?: ParentNode;
  allowSelectors?: string[];
  denySelectors?: string[];
  readOnly?: boolean;
  maskSensitiveValues?: boolean;
}

export interface SnapshotOptions {
  scope?: ParentNode;
}

export interface SnapshotNode {
  ref?: string;
  role: string;
  name: string;
  tagName: string;
  inputType?: string;
  placeholder?: string;
  value?: string;
  href?: string;
  options?: string[];
  required?: boolean;
  validationMessage?: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface SnapshotResult {
  text: string;
  nodes: SnapshotNode[];
}

export interface ActionResult {
  target: string;
}

export interface HighlightOptions {
  maskZIndex?: number;
}

export interface WaitOptions {
  timeoutMs?: number;
  state?: 'attached' | 'visible';
  text?: string;
}

export interface AgentDom {
  snapshot(options?: SnapshotOptions): AgentDomResult<SnapshotResult>;
  click(target: string): Promise<AgentDomResult<ActionResult>>;
  fill(target: string, value: string): Promise<AgentDomResult<ActionResult>>;
  focus(target: string): Promise<AgentDomResult<ActionResult>>;
  highlight(target: string, options?: HighlightOptions): AgentDomResult<ActionResult>;
  getText(target?: string): AgentDomResult<string>;
  isVisible(target: string): AgentDomResult<boolean>;
  waitFor(target: string, options?: WaitOptions): Promise<AgentDomResult<ActionResult>>;
}
