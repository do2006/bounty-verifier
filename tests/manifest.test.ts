import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('x402 well-known manifest', () => {
  test('describes the paid verification resource', async () => {
    const response = await createApp().request('/.well-known/x402');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');

    const body = await response.json() as any;
    expect(body).toMatchObject({
      x402Version: 2,
      kind: 'resource-server',
      name: 'BountyVerifier',
    });
    expect(body.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        method: 'POST',
        resource: 'POST /verify',
        price: '$0.005',
      }),
    ]));
  });
});
