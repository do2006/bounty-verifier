import { describe, expect, test } from 'vitest';
import { verifySnapshot } from '../src/domain/verify.js';

const base = {
  sourceUrl: 'https://github.com/acme/widgets/issues/7',
  repository: 'acme/widgets',
  issueNumber: 7,
  title: 'Fix API retry handling',
  body: 'Bounty: $20 USDC. Paid on merge. Fix retry handling and add tests.',
  comments: [],
  commentCount: 0,
  assignees: [],
  openRelatedPrCount: 0,
  labels: ['bounty'],
  contributionPolicy: null,
  retrievedAt: '2026-09-15T22:00:00.000Z',
};

describe('verifySnapshot', () => {
  test('marks a low-competition paid-on-merge bounty as pursue', () => {
    const result = verifySnapshot(base);
    expect(result.verdict).toBe('pursue');
    expect(result.reward).toMatchObject({ amount: 20, currency: 'USDC' });
    expect(result.payoutCondition).toBe('merge');
  });
  test('marks a bounty with several competing PRs as crowded', () => {
    const result = verifySnapshot({ ...base, openRelatedPrCount: 4 });
    expect(result.verdict).toBe('crowded');
  });

  test('blocks work that requires an upfront stake', () => {
    const result = verifySnapshot({
      ...base,
      body: 'Bounty: $20 USDC. Claim requires a 0.01 USDC stake before work starts.',
    });
    expect(result.verdict).toBe('blocked');
    expect(result.upfrontCosts).toContain('stake');
  });

  test('does not treat a sponsorship request as a funded bounty', () => {
    const result = verifySnapshot({
      ...base,
      body: 'Would you sponsor this fix for $40 USDC? I will wait for approval.',
    });
    expect(result.verdict).toBe('unverified');
    expect(result.fundingConfidence).toBe('speculative');
  });

  test('blocks a repository policy that requires human-only PR text', () => {
    const result = verifySnapshot({
      ...base,
      contributionPolicy: 'Commit messages, PR descriptions, and discussions must be 100% human-written.',
    });
    expect(result.verdict).toBe('blocked');
    expect(result.aiPolicy).toBe('human_only');
  });
});
