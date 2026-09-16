import { describe, expect, test } from 'vitest';
import type { MiddlewareHandler } from 'hono';
import { createApp } from '../src/http/app.js';

const blocker: MiddlewareHandler = async (c) =>
  c.json({ error: 'payment_required' }, 402);

describe('HTTP payment boundary', () => {
  test('keeps health and demo free while gating paid entry points', async () => {
    const app = createApp({ paymentMiddleware: blocker, paidVerification: true });

    const root = await app.request('/');
    expect(root.status).toBe(402);
    expect(await root.json()).toEqual({ error: 'payment_required' });

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


test('gates the deep verification handler before GitHub work runs', async () => {
  const app = createApp({
    paymentMiddleware: blocker,
    paidVerification: true,
    fetchSnapshot: async () => ({
      sourceUrl: 'https://github.com/acme/widgets/issues/7', repository: 'acme/widgets', issueNumber: 7,
      title: 'Paid bounty', body: 'Bounty: $20 USDC. Paid on merge.', comments: [], commentCount: 0,
      assignees: [], openRelatedPrCount: 0, labels: ['bounty'], contributionPolicy: null,
      retrievedAt: '2026-09-15T22:00:00.000Z',
    }),
  });
  const response = await app.request('/verify/deep', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://github.com/acme/widgets/issues/7' }),
  });
  expect(response.status).toBe(402);
});
