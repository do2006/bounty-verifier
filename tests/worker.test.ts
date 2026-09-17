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

  test('serves nohumans claim proof only when configured', async () => {
    const absent = await worker.fetch(
      new Request('https://example.test/.well-known/nohumans-claim'),
      {},
      {} as never,
    );
    expect(absent.status).toBe(404);

    const present = await worker.fetch(
      new Request('https://example.test/.well-known/nohumans-claim'),
      { NOHUMANS_CLAIM_TOKEN: 'claim-example-token' },
      {} as never,
    );
    expect(present.status).toBe(200);
    expect(await present.text()).toBe('claim-example-token');
    expect(present.headers.get('cache-control')).toBe('no-store');
  });

});
