// Minimal dot-path get/set over plain objects -- Patch.property is a string like
// "layout.gap" or "layout.padding.top" naming a field inside a NodeIR.
export function getAtPath(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setAtPath(obj: object, path: string[], value: unknown): void {
  if (path.length === 0) throw new Error("Cannot set at an empty path");
  let current = obj as Record<string, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (current[key] === null || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]!] = value;
}
