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

  registerChild(ref: string, element: Element): void {
    this.elements.set(ref, element);
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
  // @e16, @e16-1
  if (/^@e\d+(?:-\d+)?$/.test(trimmed)) {
    return trimmed.slice(1);
  }
  // ref=e16, ref=e16-1
  if (/^ref=e\d+(?:-\d+)?$/.test(trimmed)) {
    return trimmed.slice(4);
  }
  // e16, e16-1
  if (/^e\d+(?:-\d+)?$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
