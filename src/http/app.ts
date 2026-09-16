import { Hono, type MiddlewareHandler } from 'hono';
import type { BountySnapshot } from '../domain/types.js';
import { verifySnapshot } from '../domain/verify.js';
import { fetchGitHubSnapshot, GitHubSourceError } from '../sources/github.js';
import { parseGitHubIssueUrl } from '../sources/url.js';
import { errorEnvelope } from './errors.js';
import { homePageHtml } from './home.js';
import { x402Manifest } from './manifest.js';
import { openApiDocument } from './openapi.js';

export interface AppDependencies {
  fetchSnapshot?: (url: string) => Promise<BountySnapshot>;
  paymentMiddleware?: MiddlewareHandler;
  paidVerification?: boolean;
}

const demoSnapshot: BountySnapshot = {
  sourceUrl: 'https://github.com/demo/bounty/issues/1',
  repository: 'demo/bounty',
  issueNumber: 1,
  title: 'Fix API retry handling',
  body: 'Bounty: $20 USDC. Paid on merge.',
  comments: [],
  commentCount: 0,
  assignees: [],
  openRelatedPrCount: 0,
  labels: ['bounty'],
  contributionPolicy: 'AI-assisted contributions are allowed.',
  retrievedAt: '2026-09-15T22:00:00.000Z',
};

export function createApp(deps: AppDependencies = {}) {
  const app = new Hono();
  const fetchSnapshot = deps.fetchSnapshot ?? fetchGitHubSnapshot;
  const paidVerification = deps.paidVerification ?? Boolean(deps.paymentMiddleware);

  if (deps.paymentMiddleware) {
    app.use('/', deps.paymentMiddleware);
  }

  app.get('/', (c) => c.html(homePageHtml()));

  app.get('/openapi.json', (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=300');
    return c.json(openApiDocument());
  });

  app.get('/.well-known/x402', (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'public, max-age=300');
    return c.json(x402Manifest);
  });

  app.get('/health', (c) =>
    c.json({ ok: true, service: 'bounty-verifier', version: '0.1.0', paidVerification }),
  );

  app.get('/demo', (c) => c.json(verifySnapshot(demoSnapshot)));

  if (deps.paymentMiddleware) {
    app.use('/verify', deps.paymentMiddleware);
  }

  app.post('/verify', async (c) => {
    const requestId = crypto.randomUUID();
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json(errorEnvelope('invalid_json', 'Request body must be valid JSON.', requestId), 400);
    }

    if (!payload || typeof payload !== 'object' || !('url' in payload)) {
      return c.json(errorEnvelope('missing_url', 'A GitHub issue URL is required.', requestId), 400);
    }
    const url = (payload as { url?: unknown }).url;
    if (typeof url !== 'string' || url.length === 0) {
      return c.json(errorEnvelope('missing_url', 'A GitHub issue URL is required.', requestId), 400);
    }

    try {
      parseGitHubIssueUrl(url);
    } catch {
      return c.json(errorEnvelope('unsupported_url', 'Only public GitHub issue URLs are supported.', requestId), 400);
    }

    try {
      const snapshot = await fetchSnapshot(url);
      return c.json(verifySnapshot(snapshot));
    } catch (error) {
      if (error instanceof GitHubSourceError) {
        if (error.retryable) {
          return c.json(
            errorEnvelope('upstream_retry', 'GitHub is temporarily unavailable; retry later.', requestId),
            503,
          );
        }
        return c.json(errorEnvelope('upstream_error', error.message, requestId), 502);
      }
      return c.json(errorEnvelope('internal_error', 'Verification failed.', requestId), 500);
    }
  });

  return app;
}
