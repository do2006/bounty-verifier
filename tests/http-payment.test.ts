import { describe, expect, test } from 'vitest';
import type { MiddlewareHandler } from 'hono';
import { createApp } from '../src/http/app.js';

const blocker: MiddlewareHandler = async (c) =>
  c.json({ error: 'payment_required' }, 402);

describe('HTTP payment boundary', () => {
  test('keeps health and demo free while gating verify', async () => {
    const app = createApp({ paymentMiddleware: blocker, paidVerification: true });

    const health = await app.request('/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ paidVerification: true });

    const demo = await app.request('/demo');
    expect(demo.status).toBe(200);

    const verify = await app.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com/acme/widgets/issues/7' }),
    });
    expect(verify.status).toBe(402);
    expect(await verify.json()).toEqual({ error: 'payment_required' });
  });
});
