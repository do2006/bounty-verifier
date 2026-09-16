export type FundingConfidence =
  | 'verified'
  | 'stated_not_verified'
  | 'speculative'
  | 'unfunded'
  | 'unknown';

export type PayoutCondition = 'merge' | 'acceptance' | 'milestone' | 'contest' | 'unknown';
export type Verdict = 'pursue' | 'crowded' | 'blocked' | 'unverified';
export type AiPolicy = 'allowed' | 'human_only' | 'unknown';
export type UpfrontCost = 'stake' | 'deposit' | 'membership' | 'paid_credits' | 'gas';

export interface Reward {
  amount: number;
  currency: string;
  wording: string;
}

export interface BountySnapshot {
  sourceUrl: string;
  repository: string;
  issueNumber: number;
  title: string;
  body: string;
  comments: string[];
  commentCount: number;
  assignees: string[];
  openRelatedPrCount: number;
  labels: string[];
  contributionPolicy: string | null;
  retrievedAt: string;
}

export interface VerificationResult {
  sourceUrl: string;
  repository: string;
  issueNumber: number;
  reward: Reward | null;
  payoutCondition: PayoutCondition;
  fundingConfidence: FundingConfidence;
  upfrontCosts: UpfrontCost[];
  aiPolicy: AiPolicy;
  competition: {
    commentCount: number;
    assigneeCount: number;
    openRelatedPrCount: number;
  };
  verdict: Verdict;
}

export interface DeepVerificationResult extends VerificationResult {
  evidence: Array<{
    kind: 'reward' | 'payout' | 'claim' | 'policy' | 'competition' | 'cost';
    source: 'issue' | 'comments' | 'contribution_policy';
    excerpt: string;
  }>;
  claim: {
    state: 'assigned' | 'claim_instructions' | 'unknown';
    assignees: string[];
    instructions: string | null;
  };
  effort: {
    band: 'small' | 'medium' | 'large';
    reasons: string[];
  };
  payout: {
    rail: 'direct_stablecoin' | 'fiat' | 'major_crypto' | 'unknown';
    currency: string | null;
    notes: string[];
  };
  riskReasons: string[];
}
