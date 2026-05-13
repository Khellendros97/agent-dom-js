export function getRole(element: Element): string {
  const explicit = element.getAttribute('role');
  if (explicit) {
    return explicit;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && (element as HTMLAnchorElement).href) return 'link';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'summary') return 'button';

  if (tag === 'input') {
    const type = ((element as HTMLInputElement).type || 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
    return 'textbox';
  }

  if ((element as HTMLElement).isContentEditable) return 'textbox';
  return tag;
}

export function getAccessibleName(element: Element): string {
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  if (element.id) {
    const label = element.ownerDocument.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  const wrappingLabel = element.closest('label');
  if (wrappingLabel?.textContent?.trim()) return wrappingLabel.textContent.trim();

  const placeholder = (element as HTMLInputElement).placeholder?.trim();
  if (placeholder) return placeholder;

  const value = (element as HTMLInputElement).value?.trim();
  if (value && ['button', 'submit', 'reset'].includes((element as HTMLInputElement).type)) return value;

  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;

  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  return true;
}

export function isSensitiveElement(element: Element): boolean {
  if (!(element instanceof HTMLInputElement)) return false;
  const type = element.type.toLowerCase();
  const name = `${element.name} ${element.id} ${element.autocomplete}`.toLowerCase();
  return type === 'password' || /token|secret|otp|code|captcha/.test(name);
}
