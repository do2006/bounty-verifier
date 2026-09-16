import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

const snapshot = {
  sourceUrl: 'https://github.com/acme/widgets/issues/7',
  repository: 'acme/widgets',
  issueNumber: 7,
  title: 'Fix API retry handling',
  body: 'Bounty: $20 USDC. Paid on merge. Comment "claim" before starting. Add tests.',
  comments: ['Maintainer: AI-assisted contributions are fine.'],
  commentCount: 1,
  assignees: [],
  openRelatedPrCount: 0,
  labels: ['bounty'],
  contributionPolicy: 'AI-assisted contributions are allowed.',
  retrievedAt: '2026-09-15T22:00:00.000Z',
};

describe('POST /verify/deep', () => {
  test('returns evidence, claim, effort, payout and risk detail', async () => {
    const app = createApp({ fetchSnapshot: async () => snapshot });
    const response = await app.request('/verify/deep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: snapshot.sourceUrl }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.verdict).toBe('pursue');
    expect(body.evidence.length).toBeGreaterThan(0);
    expect(body.claim.state).toBe('claim_instructions');
    expect(body.claim.instructions).toContain('claim');
    expect(body.effort.band).toBe('small');
    expect(body.payout.rail).toBe('direct_stablecoin');
    expect(body.riskReasons).toEqual([]);
  });
});
