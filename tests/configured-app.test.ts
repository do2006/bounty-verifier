import { describe, expect, test } from 'vitest';
import type { MiddlewareHandler } from 'hono';
import { createConfiguredApp } from '../src/configured-app.js';

const receiver = '0x1111111111111111111111111111111111111111';

describe('createConfiguredApp', () => {
  test('enables the paid boundary when payment config is valid', async () => {
    const paymentMiddleware: MiddlewareHandler = async (c) =>
      c.json({ error: 'payment_required' }, 402);

    const app = createConfiguredApp(
      { PAYMENTS_ENABLED: 'true', X402_RECEIVER: receiver },
      () => paymentMiddleware,
    );

    const health = await app.request('/health');
    expect(await health.json()).toMatchObject({ paidVerification: true });

    const verify = await app.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com/acme/widgets/issues/7' }),
    });
    expect(verify.status).toBe(402);
  });

  test('keeps verification free when payment config is disabled', async () => {
    const app = createConfiguredApp({});
    const health = await app.request('/health');
    expect(await health.json()).toMatchObject({ paidVerification: false });
  });
});
