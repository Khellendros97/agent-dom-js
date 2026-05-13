export class RefRegistry {
  private elements = new Map<string, Element>();
  private nextId = 1;

  clear(): void {
    this.elements.clear();
    this.nextId = 1;
  }

  register(element: Element): string {
    const ref = `e${this.nextId}`;
    this.nextId += 1;
    this.elements.set(ref, element);
    return ref;
  }

  resolve(target: string): Element | null {
    const ref = parseRef(target);
    if (!ref) {
      return null;
    }

    const element = this.elements.get(ref);
    if (!element || !element.isConnected) {
      return null;
    }

    return element;
  }
}

export function parseRef(target: string): string | null {
  const trimmed = target.trim();
  if (/^@e\d+$/.test(trimmed)) {
    return trimmed.slice(1);
  }
  if (/^ref=e\d+$/.test(trimmed)) {
    return trimmed.slice(4);
  }
  if (/^e\d+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
