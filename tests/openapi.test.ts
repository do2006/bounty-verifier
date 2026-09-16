import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('OpenAPI discovery document', () => {
  test('publishes x402scan-compatible metadata for /verify', async () => {
    const response = await createApp().request('/openapi.json');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const spec = await response.json() as any;
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.contact.email).toBe('dwayneoneill@nightfalltechnologies.com');
    expect(spec.paths['/verify'].post['x-payment-info']).toMatchObject({
      protocols: ['x402'],
      pricingMode: 'fixed',
      price: '0.005',
      currency: 'USD',
    });
    expect(spec.paths['/verify'].post.responses['402']).toBeTruthy();
    expect(spec.paths['/verify'].post.requestBody.required).toBe(true);
    expect(spec.paths['/verify/deep']).toBeTruthy();
    expect(spec.paths['/verify/deep']?.post['x-payment-info']).toMatchObject({
      protocols: ['x402'], pricingMode: 'fixed', price: '0.05', currency: 'USD',
    });
    expect(spec.paths['/verify/deep']?.post.responses['402']).toBeTruthy();
  });
});
