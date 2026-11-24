export class SeededRng {
  private state: number;

  constructor(seed: string | number) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Returns a float in [0, 1) using Mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  fork(salt: string): SeededRng {
    return new SeededRng(`${this.state}:${salt}`);
  }
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const SEED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateReadableSeed(): string {
  const pick = (n: number) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
    }
    return out;
  };
  return `BW-${pick(4)}-${pick(2)}`;
}

export function normalizeSeed(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 16) : generateReadableSeed();
}
