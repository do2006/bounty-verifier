import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';
import { GitHubSourceError } from '../src/sources/github.js';

const snapshot = {
  sourceUrl: 'https://github.com/acme/widgets/issues/7',
  repository: 'acme/widgets',
  issueNumber: 7,
  title: 'Fix retry handling',
  body: 'Bounty: $20 USDC. Paid on merge.',
  comments: [],
  commentCount: 0,
  assignees: [],
  openRelatedPrCount: 0,
  labels: ['bounty'],
  contributionPolicy: 'AI-assisted contributions are allowed.',
  retrievedAt: '2026-09-15T22:00:00.000Z',
};

function appWithSnapshot() {
  return createApp({ fetchSnapshot: async () => snapshot });
}

describe('HTTP API', () => {
  test('GET /health returns service metadata', async () => {
    const response = await appWithSnapshot().request('/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, service: 'bounty-verifier' });
  });

  test('GET /demo returns a sample verification', async () => {
    const response = await appWithSnapshot().request('/demo');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ verdict: 'pursue', repository: 'demo/bounty' });
  });

  test('POST /verify returns a live verification result', async () => {
    const response = await appWithSnapshot().request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: snapshot.sourceUrl }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      repository: 'acme/widgets',
      verdict: 'pursue',
      reward: { amount: 20, currency: 'USDC' },
    });
  });

  test('POST /verify rejects malformed JSON', async () => {
    const response = await appWithSnapshot().request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json',
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'invalid_json' } });
  });

  test('POST /verify requires a URL', async () => {
    const response = await appWithSnapshot().request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'missing_url' } });
  });

  test('POST /verify rejects unsupported URLs before fetching', async () => {
    const response = await appWithSnapshot().request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/not-github' }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'unsupported_url' } });
  });

  test('POST /verify surfaces retryable GitHub failures as 503', async () => {
    const app = createApp({
      fetchSnapshot: async () => {
        throw new GitHubSourceError('rate limited', 429, true);
      },
    });
    const response = await app.request('/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: snapshot.sourceUrl }),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'upstream_retry' } });
  });
});
