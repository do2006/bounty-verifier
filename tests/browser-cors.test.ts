import { describe, expect, test } from 'vitest';
import type { MiddlewareHandler } from 'hono';
import { createApp } from '../src/http/app.js';

const paymentBlocker: MiddlewareHandler = async (c) => {
  c.header('Payment-Required', 'challenge');
  return c.json({ error: 'payment_required' }, 402);
};

describe('browser-readable x402 surface', () => {
  test('answers paid-route preflight without invoking payment middleware', async () => {
    const app = createApp({ paymentMiddleware: paymentBlocker, paidVerification: true });
    const response = await app.request('/verify', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://agent.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,payment-signature,x-payment',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toContain('payment-signature');
  });

  test('exposes x402 response headers on an actual 402', async () => {
    const app = createApp({ paymentMiddleware: paymentBlocker, paidVerification: true });
    const response = await app.request('/verify', { method: 'POST' });
    expect(response.status).toBe(402);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-expose-headers')).toContain('payment-required');
  });
});