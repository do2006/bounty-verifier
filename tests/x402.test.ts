import { describe, expect, test } from 'vitest';
import { Hono } from 'hono';
import type { FacilitatorClient } from '@x402/core/server';
import { createX402PaymentMiddleware } from '../src/payment/x402.js';

const facilitator: FacilitatorClient = {
  async getSupported() {
    return {
      kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
      extensions: ['bazaar'],
      signers: { 'eip155:*': ['0x2222222222222222222222222222222222222222'] },
    };
  },
  async verify() {
    throw new Error('not reached without payment');
  },
  async settle() {
    throw new Error('not reached without payment');
  },
};

describe('createX402PaymentMiddleware', () => {
  test('returns x402 payment requirements for an unpaid verify request', async () => {
    const app = new Hono();
    app.use('/verify', createX402PaymentMiddleware({
      enabled: true,
      receiver: '0x1111111111111111111111111111111111111111',
      facilitatorUrl: 'https://example.invalid',
      network: 'eip155:8453',
      price: '$0.02',
    }, facilitator));
    app.post('/verify', (c) => c.json({ ok: true }));

    const response = await app.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com/acme/widgets/issues/7' }),
    });

    expect(response.status).toBe(402);
    const header = response.headers.get('payment-required');
    expect(header).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(header!, 'base64').toString('utf8'));
    expect(decoded.extensions?.bazaar).toBeTruthy();
  });
});
