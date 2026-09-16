import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('buyer landing page', () => {
  test('serves a useful HTML page at the root', async () => {
    const app = createApp();
    const response = await app.request('/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const body = await response.text();
    expect(body).toContain('BountyVerifier');
    expect(body).toContain('$0.02 USDC');
    expect(body).toContain('/verify');
    expect(body).toContain('/demo');
  });
});
