import {
  detectAiPolicy,
  detectFundingConfidence,
  detectPayoutCondition,
  detectUpfrontCosts,
  parseReward,
} from './rules.js';
import type { BountySnapshot, VerificationResult, Verdict } from './types.js';

export function verifySnapshot(snapshot: BountySnapshot): VerificationResult {
  const combinedText = [snapshot.title, snapshot.body, ...snapshot.comments].join('\n');
  const reward = parseReward(combinedText);
  const payoutCondition = detectPayoutCondition(combinedText);
  const fundingConfidence = detectFundingConfidence(combinedText);
  const upfrontCosts = detectUpfrontCosts(combinedText);
  const aiPolicy = detectAiPolicy(snapshot.contributionPolicy);

  let verdict: Verdict = 'pursue';
  if (upfrontCosts.length > 0 || aiPolicy === 'human_only') verdict = 'blocked';
  else if (snapshot.openRelatedPrCount >= 3 || snapshot.assignees.length >= 2) verdict = 'crowded';
  else if (!reward || ['speculative', 'unfunded', 'unknown'].includes(fundingConfidence)) {
    verdict = 'unverified';
  }

  return {
    sourceUrl: snapshot.sourceUrl,
    repository: snapshot.repository,
    issueNumber: snapshot.issueNumber,
    reward,
    payoutCondition,
    fundingConfidence,
    upfrontCosts,
    aiPolicy,
    competition: {
      commentCount: snapshot.commentCount,
      assigneeCount: snapshot.assignees.length,
      openRelatedPrCount: snapshot.openRelatedPrCount,
    },
    verdict,
  };
}
