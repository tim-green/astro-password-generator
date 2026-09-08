/**
 * Cryptographically secure random helpers.
 * Uses the Web Crypto API instead of Math.random() so generated
 * passwords aren't predictable.
 */

/* Returns a secure random integer in [0, max) */
export function secureRandomInt(max: number): number {
  if (max <= 0) return 0;

  /* Calculate the number of bytes needed to represent the range [0, max) */
  const range = Math.ceil(Math.log2(max) / 8);
  const bytes = new Uint8Array(range || 1);
  const maxValid = Math.floor(256 ** bytes.length / max) * max;

  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes.reduce((acc, byte) => acc * 256 + byte, 0);
  } while (value >= maxValid);

  return value % max;
}

/* Returns a random element from a non-empty array */
export function secureRandomItem<T>(items: readonly T[]): T {
  return items[secureRandomInt(items.length)];
}

/* Shuffles an array in place using the Fisher-Yates algorithm and secure random numbers */
export function secureShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
