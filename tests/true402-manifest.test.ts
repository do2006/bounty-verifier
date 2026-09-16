import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('true402 discovery manifest', () => {
  test('publishes the registered service manifest for free', async () => {
    const response = await createApp().request('/.well-known/x402-service.json');
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const body = await response.json() as any;
    expect(body).toMatchObject({
      x402: '1.0',
      name: 'BountyVerifier',
      pricing: { currency: 'USDC', base: '0.005', unit: 'request' },
      payment: { chain: 'base' },
      endpoint: 'https://bounty-verifier-api.planet-teacher.workers.dev/verify',
    });
  });
});