import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

describe('paid marketplace canary input', () => {
  test('advertises a real public GitHub issue instead of a placeholder', () => {
    const source = readFileSync(new URL('../src/payment/x402.ts', import.meta.url), 'utf8');
    expect(source).toContain("input: { url: 'https://github.com/x402-foundation/x402/issues/803' }");
    expect(source).not.toContain('https://github.com/owner/repo/issues/123');
  });
});