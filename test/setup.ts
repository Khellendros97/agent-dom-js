if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

if (!(globalThis as Record<string, unknown>).CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    value: {},
    configurable: true,
  });
}

if (!CSS.escape) {
  CSS.escape = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
