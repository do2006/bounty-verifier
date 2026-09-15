import { describe, expect, test } from 'vitest';
import { fetchGitHubSnapshot, GitHubSourceError } from '../src/sources/github.js';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeFetch(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/repos/acme/widgets/issues/7')) {
      return json({
        title: 'Fix retry handling',
        body: 'Bounty: $20 USDC. Paid on merge.',
        comments: 1,
        assignees: [{ login: 'alice' }],
        labels: [{ name: 'bounty' }],
      });
    }
    if (url.includes('/repos/acme/widgets/issues/7/comments')) {
      return json([{ body: 'AI-assisted contributions are allowed.' }]);
    }
    if (url.includes('/search/issues')) return json({ total_count: 1, items: [{}] });
    if (url.endsWith('/repos/acme/widgets/contents/CONTRIBUTING.md')) {
      return json({ content: Buffer.from('AI-assisted contributions are allowed.').toString('base64') });
    }
    return json({ message: 'not found' }, 404);
  }) as typeof fetch;
}

describe('fetchGitHubSnapshot', () => {
  test('builds a bounty snapshot from GitHub issue data', async () => {
    const snapshot = await fetchGitHubSnapshot(
      'https://github.com/acme/widgets/issues/7',
      makeFetch(),
    );

    expect(snapshot).toMatchObject({
      repository: 'acme/widgets',
      issueNumber: 7,
      title: 'Fix retry handling',
      body: 'Bounty: $20 USDC. Paid on merge.',
      comments: ['AI-assisted contributions are allowed.'],
      commentCount: 1,
      assignees: ['alice'],
      labels: ['bounty'],
      openRelatedPrCount: 1,
      contributionPolicy: 'AI-assisted contributions are allowed.',
    });
  });

  test('marks rate-limit failures as retryable typed errors', async () => {
    const limited = (async () => json({ message: 'rate limited' }, 429)) as typeof fetch;
    await expect(fetchGitHubSnapshot('https://github.com/acme/widgets/issues/7', limited))
      .rejects.toMatchObject({ status: 429, retryable: true });
  });
});
