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
  test('returns x402 requirements in both header and JSON body', async () => {
    const app = new Hono();
    app.use('/verify', createX402PaymentMiddleware({
      enabled: true,
      receiver: '0x1111111111111111111111111111111111111111',
      facilitatorUrl: 'https://example.invalid',
      network: 'eip155:8453',
      price: '$0.005',
      deepPrice: '$0.05',
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
    expect(decoded.extensions).toBeUndefined();

    const body = await response.json() as any;
    expect(body.extensions).toEqual(decoded.extensions);
    expect(body.x402Version).toBe(2);
    expect(body.accepts).toHaveLength(1);
    expect(body.accepts[0]).toMatchObject({
      scheme: 'exact',
      network: 'eip155:8453',
      amount: '5000',
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      payTo: '0x1111111111111111111111111111111111111111',
    });
    expect(body.extensions).toBeUndefined();
  });
});


test('returns a decodable x402 challenge at the service root', async () => {
  const app = new Hono();
  app.use('/', createX402PaymentMiddleware({
    enabled: true,
    receiver: '0x1111111111111111111111111111111111111111',
    facilitatorUrl: 'https://example.invalid',
    network: 'eip155:8453',
    price: '$0.005',
    deepPrice: '$0.05',
  }, facilitator));
  app.get('/', (c) => c.html('<h1>BountyVerifier</h1>'));

  const response = await app.request('/');
  expect(response.status).toBe(402);

  const header = response.headers.get('payment-required');
  expect(header).toBeTruthy();
  const decoded = JSON.parse(Buffer.from(header!, 'base64').toString('utf8'));
  expect(decoded.accepts?.[0]).toMatchObject({
    network: 'eip155:8453',
    amount: '5000',
    payTo: '0x1111111111111111111111111111111111111111',
  });

  const body = await response.json() as any;
  expect(body.x402Version).toBe(2);
  expect(body.accepts?.[0]?.amount).toBe('5000');
});


test('charges the deep verification route at five cents', async () => {
  const app = new Hono();
  app.use('/verify/deep', createX402PaymentMiddleware({
    enabled: true,
    receiver: '0x1111111111111111111111111111111111111111',
    facilitatorUrl: 'https://example.invalid',
    network: 'eip155:8453',
    price: '$0.005',
    deepPrice: '$0.05',
  }, facilitator));
  app.post('/verify/deep', (c) => c.json({ ok: true }));

  const response = await app.request('/verify/deep', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://github.com/acme/widgets/issues/7' }),
  });

  expect(response.status).toBe(402);
  const header = response.headers.get('payment-required');
  expect(header).toBeTruthy();
  const decoded = JSON.parse(Buffer.from(header!, 'base64').toString('utf8'));
  expect(decoded.accepts?.[0]?.amount).toBe('50000');
});


test('returns an unpaid challenge without contacting the facilitator on a cold isolate', async () => {
  let supportedCalls = 0;
  const coldFacilitator: FacilitatorClient = {
    async getSupported() {
      supportedCalls += 1;
      throw new Error('unpaid challenge must not contact facilitator');
    },
    async verify() { throw new Error('not reached without payment'); },
    async settle() { throw new Error('not reached without payment'); },
  };
  const app = new Hono();
  app.use('/verify', createX402PaymentMiddleware({
    enabled: true,
    receiver: '0x1111111111111111111111111111111111111111',
    facilitatorUrl: 'https://example.invalid',
    network: 'eip155:8453',
    price: '$0.005',
    deepPrice: '$0.05',
  }, coldFacilitator));
  app.post('/verify', (c) => c.json({ ok: true }));

  const response = await app.request('/verify', { method: 'POST' });
  expect(response.status).toBe(402);
  expect(response.headers.get('payment-required')).toBeTruthy();
  expect(supportedCalls).toBe(0);
});
