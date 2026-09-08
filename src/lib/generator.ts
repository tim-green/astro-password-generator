import { secureRandomInt, secureRandomItem, secureShuffle } from "./random";
import { WORDLIST } from "./wordlist";

/** Options for generating a random-character password */
export type CharacterOptions = {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  length: number;
};

/* Options for generating a word-based passphrase */
export type PassphraseOptions = {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
};

/* Character pools for random-character password generation. Excludes ambiguous characters like 0/O and 1/l/I. */
const POOLS = {
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lowercase: "abcdefghijkmnpqrstuvwxyz",
  numbers: "23456789",
  symbols: "!@#$%^&*()-_=+[]{}?",
} as const;

/** Generates a single random-character password from the given options */
export function generatePassword(options: CharacterOptions): string {
  const activePools = (Object.keys(POOLS) as Array<keyof typeof POOLS>).filter(
    (key) => options[key]
  );

  if (activePools.length === 0) return "";

  const fullPool = activePools.map((key) => POOLS[key]).join("");

  // Guarantee at least one character from each selected pool, then fill
  // the remainder randomly and shuffle so the guaranteed picks aren't
  // always in the same position.
  const guaranteed = activePools.map((key) => secureRandomItem(POOLS[key].split("")));
  const remainingCount = Math.max(0, options.length - guaranteed.length);
  const filler = Array.from({ length: remainingCount }, () =>
    secureRandomItem(fullPool.split(""))
  );

  const chars = secureShuffle([...guaranteed, ...filler]).slice(0, options.length);
  return chars.join("");
}

/* Generates a single word-based passphrase from the given options */
export function generatePassphrase(options: PassphraseOptions): string {
  const words = Array.from({ length: options.wordCount }, () =>
    secureRandomItem(WORDLIST)
  ).map((word) => (options.capitalize ? capitalize(word) : word));

  if (options.includeNumber) {
    const position = secureRandomInt(words.length + 1);
    const digits = String(secureRandomInt(90) + 10); // 2-digit number
    words.splice(position, 0, digits);
  }

  return words.join(options.separator);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* Rough Shannon-style entropy estimate, in bits */
export function estimatePasswordEntropy(options: CharacterOptions): number {
  const poolSize = (Object.keys(POOLS) as Array<keyof typeof POOLS>)
    .filter((key) => options[key])
    .reduce((size, key) => size + POOLS[key].length, 0);

  if (poolSize === 0 || options.length === 0) return 0;
  return options.length * Math.log2(poolSize);
}

export function estimatePassphraseEntropy(options: PassphraseOptions): number {
  const perWord = Math.log2(WORDLIST.length);
  let bits = options.wordCount * perWord;
  if (options.capitalize) bits += options.wordCount; // 1 bit/word for case
  if (options.includeNumber) bits += Math.log2(90) + Math.log2(options.wordCount + 1);
  return bits;
}

export type StrengthLevel = "weak" | "fair" | "good" | "strong" | "very strong";

export function strengthFromEntropy(bits: number): StrengthLevel {
  if (bits < 28) return "weak";
  if (bits < 40) return "fair";
  if (bits < 60) return "good";
  if (bits < 80) return "strong";
  return "very strong";
}
