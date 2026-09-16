import { describe, expect, test } from 'vitest';
import { Hono } from 'hono';
import type { FacilitatorClient } from '@x402/core/server';
import { createX402PaymentMiddleware } from '../src/payment/x402.js';

const facilitator: FacilitatorClient = {
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }], extensions: ['bazaar'], signers: { 'eip155:*': ['0x2222222222222222222222222222222222222222'] } }; },
  async verify() { throw new Error('not reached'); },
  async settle() { throw new Error('not reached'); },
};

const config = { enabled: true as const, receiver: '0x1111111111111111111111111111111111111111', facilitatorUrl: 'https://example.invalid', network: 'eip155:8453', price: '$0.005', deepPrice: '$0.05' };

describe('GET marketplace probes', () => {
  for (const [path, amount] of [['/verify', '5000'], ['/verify/deep', '50000']] as const) {
    test(`${path} returns its x402 challenge to GET probes`, async () => {
      const app = new Hono();
      app.use(path, createX402PaymentMiddleware(config, facilitator));
      app.get(path, (c) => c.json({ method: 'POST required after payment' }));
      const response = await app.request(path);
      expect(response.status).toBe(402);
      const encoded = response.headers.get('payment-required');
      expect(encoded).toBeTruthy();
      const decoded = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8'));
      expect(decoded.accepts?.[0]?.amount).toBe(amount);
    });
  }
});