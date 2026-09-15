import { describe, expect, test } from 'vitest';
import worker from '../src/worker.js';

describe('worker entry', () => {
  test('serves health with payments disabled by default', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/health'),
      {},
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      service: 'bounty-verifier',
      paidVerification: false,
    });
  });
});
