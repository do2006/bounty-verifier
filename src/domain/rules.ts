import type {
  AiPolicy,
  FundingConfidence,
  PayoutCondition,
  Reward,
  UpfrontCost,
} from './types.js';

export function parseReward(text: string): Reward | null {
  const dollar = text.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*(USDC|USD|USDT|BCH|BTC|ETH)?/i);
  if (dollar) {
    const currency = (dollar[2] ?? 'USD').toUpperCase();
    return { amount: Number(dollar[1]), currency, wording: dollar[0].replace(/\s+/g, ' ').trim() };
  }

  const crypto = text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(USDC|USDT|BCH|BTC|ETH|XMR)\b/i);
  if (!crypto) return null;
  const currency = crypto[2];
  if (!currency) return null;
  return {
    amount: Number(crypto[1]),
    currency: currency.toUpperCase(),
    wording: crypto[0].replace(/\s+/g, ' ').trim(),
  };
}

export function detectPayoutCondition(text: string): PayoutCondition {
  if (/paid|payment|payout/i.test(text) && /\bmerge(?:d)?\b/i.test(text)) return 'merge';
  if (/upon acceptance|after acceptance|accepted deliverable/i.test(text)) return 'acceptance';
  if (/milestone/i.test(text)) return 'milestone';
  if (/winner|competition|contest|first .* wins/i.test(text)) return 'contest';
  return 'unknown';
}

export function detectUpfrontCosts(text: string): UpfrontCost[] {
  const lower = text.toLowerCase();
  const costs: UpfrontCost[] = [];
  if (/\bstake|staking\b/.test(lower)) costs.push('stake');
  if (/\bdeposit\b/.test(lower)) costs.push('deposit');
  if (/membership fee|paid membership|subscription required/.test(lower)) costs.push('membership');
  if (/paid credits|buy credits|purchase credits/.test(lower)) costs.push('paid_credits');
  if (/must .*gas|pay .*gas|gas required/.test(lower)) costs.push('gas');
  return costs;
}

export function detectFundingConfidence(text: string): FundingConfidence {
  if (/\bunderfunded\b|\bunfunded\b/i.test(text)) return 'unfunded';
  if (/would you sponsor|please sponsor|request(?:ing)? (?:a )?bounty|proposed bounty/i.test(text)) {
    return 'speculative';
  }
  if (/\bbounty\b|\breward\b/i.test(text) && /paid on merge|payment .*merge|paid .*accept/i.test(text)) {
    return 'stated_not_verified';
  }
  return 'unknown';
}

export function detectAiPolicy(text: string | null): AiPolicy {
  if (!text) return 'unknown';
  if (/100% human-written|human[- ]only|no (?:ai|llm)|ai-generated .* not accepted/i.test(text)) {
    return 'human_only';
  }
  if (/ai (?:is )?allowed|ai-assisted .* allowed|llm .* allowed/i.test(text)) return 'allowed';
  return 'unknown';
}
