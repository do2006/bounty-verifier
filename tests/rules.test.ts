import { describe, expect, test } from 'vitest';
import {
  detectAiPolicy,
  detectFundingConfidence,
  detectPayoutCondition,
  detectUpfrontCosts,
  parseReward,
} from '../src/domain/rules.js';

describe('bounty text rules', () => {
  test('parses dollar-denominated USDC rewards', () => {
    expect(parseReward('Bounty: $150 USDC paid on merge.')).toEqual({
      amount: 150,
      currency: 'USDC',
      wording: '$150 USDC',
    });
  });

  test('detects merge payout language', () => {
    expect(detectPayoutCondition('Payment processed after the PR is merged.')).toBe('merge');
  });

  test('detects stake and deposit requirements', () => {
    expect(detectUpfrontCosts('Claim requires a 1 USDC stake and refundable deposit.')).toEqual([
      'stake',
      'deposit',
    ]);
  });

  test('marks sponsorship-request language as speculative', () => {
    expect(detectFundingConfidence('Would you sponsor this fix for $40?')).toBe('speculative');
  });

  test('marks explicit paid-on-merge language as stated but not independently verified', () => {
    expect(detectFundingConfidence('Bounty: $50. Paid on merge.')).toBe('stated_not_verified');
  });

  test('detects human-only contribution policies', () => {
    expect(
      detectAiPolicy('PR descriptions, commit messages, and discussions must be 100% human-written.'),
    ).toBe('human_only');
  });

  test('returns unknown when policy text says nothing about AI', () => {
    expect(detectAiPolicy('Please run npm test before submitting.')).toBe('unknown');
  });
});
