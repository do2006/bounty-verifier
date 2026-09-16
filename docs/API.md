# BountyVerifier API

Base URL: `https://bounty-verifier-api.planet-teacher.workers.dev`

## GET /health

Returns service health and whether paid verification is enabled.

Example:
```json
{
  "ok": true,
  "service": "bounty-verifier",
  "version": "0.1.0",
  "paidVerification": true
}
```

## GET /demo

Returns a free fixture-backed example with the same core result shape as a paid verification.

## POST /verify

Request:
```json
{
  "url": "https://github.com/owner/repo/issues/123"
}
```

Without payment, the route returns HTTP `402` with the `PAYMENT-REQUIRED` header using x402 v2.

Payment requirement:
- protocol: x402 v2
- scheme: `exact`
- network: Base mainnet (`eip155:8453`)
- asset: Circle USDC on Base
- price: `$0.02`

A successful paid response includes fields such as:
```json
{
  "sourceUrl": "https://github.com/owner/repo/issues/123",
  "repository": "owner/repo",
  "issueNumber": 123,
  "reward": { "amount": 20, "currency": "USDC", "wording": "$20 USDC" },
  "payoutCondition": "merge",
  "fundingConfidence": "stated_not_verified",
  "upfrontCosts": [],
  "aiPolicy": "unknown",
  "competition": {
    "commentCount": 0,
    "assigneeCount": 0,
    "openRelatedPrCount": 0
  },
  "verdict": "pursue"
}
```

`verdict` is an operational classification, not a promise of payment or financial return.
