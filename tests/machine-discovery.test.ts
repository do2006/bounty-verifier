import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('machine discovery aliases', () => {
  test('publishes the x402 manifest at the common JSON well-known path', async () => {
    const response = await createApp().request('/.well-known/x402-manifest.json');
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.name).toBe('BountyVerifier');
    expect(body.resources).toHaveLength(2);
  });

  test('publishes concise LLM-readable service instructions', async () => {
    const response = await createApp().request('/llms.txt');
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('BountyVerifier');
    expect(text).toContain('POST /verify - $0.005 USDC');
    expect(text).toContain('POST /verify/deep - $0.05 USDC');
  });
});