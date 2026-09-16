import {
  detectAiPolicy,
  detectFundingConfidence,
  detectPayoutCondition,
  detectUpfrontCosts,
  parseReward,
} from './rules.js';
import type { BountySnapshot, DeepVerificationResult, VerificationResult, Verdict } from './types.js';

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

function excerptFor(text: string, pattern: RegExp): string | null {
  const parts = text.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  return parts.find((part) => pattern.test(part)) ?? null;
}

function detectClaim(snapshot: BountySnapshot) {
  if (snapshot.assignees.length > 0) {
    return { state: 'assigned' as const, assignees: snapshot.assignees, instructions: null };
  }
  const text = [snapshot.body, ...snapshot.comments].join('\n');
  const instructions = excerptFor(text, /(?:comment|reply).{0,50}\bclaim\b|\bclaim\b.{0,50}(?:before|comment|reply)/i);
  return {
    state: instructions ? 'claim_instructions' as const : 'unknown' as const,
    assignees: snapshot.assignees,
    instructions,
  };
}

function estimateEffort(snapshot: BountySnapshot) {
  const text = [snapshot.title, snapshot.body, ...snapshot.comments].join('\n');
  const reasons: string[] = [];
  const largeSignal = /\b(architecture|migration|rewrite|multi-repo|cross-repo|cross-platform)\b/i.test(text);
  if (largeSignal) reasons.push('Issue wording signals broad architectural or migration work.');
  if (text.length > 5000) reasons.push('Issue discussion is unusually large.');
  if (snapshot.commentCount > 12) reasons.push('Long discussion history increases coordination cost.');
  if (reasons.length > 0) return { band: 'large' as const, reasons };
  if (text.length <= 1200 && snapshot.commentCount <= 2 && snapshot.openRelatedPrCount <= 1) {
    return { band: 'small' as const, reasons: ['Scope and discussion are compact.'] };
  }
  return { band: 'medium' as const, reasons: ['Scope has moderate text, discussion, or competition.'] };
}

function payoutDetails(currency: string | null) {
  if (!currency) return { rail: 'unknown' as const, currency: null, notes: ['No payout currency was detected.'] };
  const upper = currency.toUpperCase();
  if (['USDC', 'USDT'].includes(upper)) {
    return { rail: 'direct_stablecoin' as const, currency: upper, notes: ['Stablecoin payout wording detected.'] };
  }
  if (upper === 'USD') {
    return { rail: 'fiat' as const, currency: upper, notes: ['USD-denominated payout wording detected.'] };
  }
  if (['BTC', 'ETH', 'BCH', 'XMR'].includes(upper)) {
    return { rail: 'major_crypto' as const, currency: upper, notes: ['Major cryptocurrency payout wording detected.'] };
  }
  return { rail: 'unknown' as const, currency: upper, notes: ['Payout asset detected but cashability is not classified.'] };
}

function riskReasons(result: VerificationResult): string[] {
  const reasons: string[] = [];
  if (result.upfrontCosts.length) reasons.push(`Upfront cost detected: ${result.upfrontCosts.join(', ')}.`);
  if (result.aiPolicy === 'human_only') reasons.push('Repository policy requires human-only contribution text.');
  if (result.competition.openRelatedPrCount >= 3) reasons.push('Several related pull requests are already open.');
  if (result.competition.assigneeCount >= 2) reasons.push('Multiple assignees are already attached to the issue.');
  if (['speculative', 'unfunded', 'unknown'].includes(result.fundingConfidence)) {
    reasons.push(`Funding confidence is ${result.fundingConfidence}.`);
  }
  return reasons;
}

function buildEvidence(snapshot: BountySnapshot, result: VerificationResult, claim: ReturnType<typeof detectClaim>) {
  const evidence: DeepVerificationResult['evidence'] = [];
  const issueText = [snapshot.title, snapshot.body].join('\n');
  const allComments = snapshot.comments.join('\n');
  if (result.reward) {
    evidence.push({ kind: 'reward', source: issueText.includes(result.reward.wording) ? 'issue' : 'comments', excerpt: result.reward.wording });
  }
  const payoutExcerpt = excerptFor(`${issueText}\n${allComments}`, /paid on merge|upon acceptance|after acceptance|milestone|contest|winner/i);
  if (payoutExcerpt) evidence.push({ kind: 'payout', source: issueText.includes(payoutExcerpt) ? 'issue' : 'comments', excerpt: payoutExcerpt });
  if (claim.instructions) evidence.push({ kind: 'claim', source: issueText.includes(claim.instructions) ? 'issue' : 'comments', excerpt: claim.instructions });
  if (snapshot.contributionPolicy) evidence.push({ kind: 'policy', source: 'contribution_policy', excerpt: snapshot.contributionPolicy.slice(0, 240) });
  if (snapshot.assignees.length || snapshot.openRelatedPrCount) {
    evidence.push({ kind: 'competition', source: 'issue', excerpt: `${snapshot.assignees.length} assignees; ${snapshot.openRelatedPrCount} related open PRs.` });
  }
  const costExcerpt = excerptFor(`${issueText}\n${allComments}`, /stake|deposit|membership|paid credits?|gas fee|upfront/i);
  if (costExcerpt && result.upfrontCosts.length) evidence.push({ kind: 'cost', source: issueText.includes(costExcerpt) ? 'issue' : 'comments', excerpt: costExcerpt });
  return evidence;
}

export function verifyDeepSnapshot(snapshot: BountySnapshot): DeepVerificationResult {
  const base = verifySnapshot(snapshot);
  const claim = detectClaim(snapshot);
  return {
    ...base,
    evidence: buildEvidence(snapshot, base, claim),
    claim,
    effort: estimateEffort(snapshot),
    payout: payoutDetails(base.reward?.currency ?? null),
    riskReasons: riskReasons(base),
  };
}
