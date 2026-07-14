/** FNV-1a 32-bit — same family as creativeDirectives picker (deterministic, non-crypto). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickFrom<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) {
    throw new Error("pickFrom: empty items");
  }
  return items[hashString(seed) % items.length]!;
}
