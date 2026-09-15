# BountyVerifier Paid API — Design

## Purpose
Build a small paid API that helps autonomous agents and human bounty hunters decide whether a public technical bounty is actually worth pursuing before they spend time coding.

The service accepts a public GitHub issue or bounty URL and returns evidence-backed facts about payout terms, funding confidence, competition, claim rules, AI-policy constraints, payout rail, estimated effort, and major red flags.

The product is intentionally narrow: it does not execute trades, hold funds, sign transactions, or ask for wallet secrets. It sells verification and triage as an information service.

## Success Criteria
1. A caller can submit a supported public bounty URL and receive a structured verification result.
2. Every important conclusion includes source evidence or an explicit `unverified` status.
3. The service detects obvious crowding, speculative reward language, upfront stake/deposit requirements, and human-only contribution policies.
4. A free health/demo route exists; paid verification is exposed through x402-compatible payment gating.
5. Deployment can start on free-tier infrastructure and requires no upfront spend from the owner.
6. The receiving side uses only a public Base-compatible address; no private key or seed phrase is ever collected by this service.

## MVP API

### `GET /health`
Returns service status, version, supported source types, and whether paid verification is enabled. No payment required.

### `POST /verify`
Input:
- `url`: public GitHub issue URL for MVP
- optional `mode`: `fast` or `deep`

Output:
- normalized source URL and repository
- stated reward amount/currency and exact reward wording
- payout condition: merge, acceptance, milestone, contest, unknown
- funding confidence: `verified`, `stated_not_verified`, `speculative`, `unfunded`, `unknown`
- competition: comment count, assignees, open related PR count when discoverable
- claim state and claim instructions
- upfront-cost flags: stake, deposit, membership, paid credits, gas requirement
- AI/contributor-policy flags
- payout rail and cashability notes
- estimated implementation effort band
- verdict: `pursue`, `crowded`, `blocked`, or `unverified`
- evidence array containing URL, field, excerpt, and retrieval timestamp

The verdict is a workflow classification, not a guarantee of payment or financial return.

## Architecture
Use a small TypeScript service suitable for Cloudflare Workers or another free-tier edge runtime.

Components:
1. **HTTP layer** — validates requests, serves health/demo responses, invokes verifier.
2. **Source adapter** — fetches GitHub issue, comments, repository metadata, contribution policy, and related PR evidence through public GitHub APIs/pages.
3. **Rule engine** — deterministic checks for payout language, speculative wording, crowding, assignment state, upfront-cost requirements, and AI-policy conflicts.
4. **Evidence builder** — records the source supporting every nontrivial field and keeps unknowns explicit.
5. **Payment gate** — x402-compatible middleware in front of paid verification. Business logic remains independent so a different payment provider can replace it later.
6. **Usage store** — minimal request counters and anonymous operational metrics; no unnecessary user profiles.

No LLM is required for the first release. Deterministic parsing keeps the service cheap, fast, reproducible, and easier to test. An optional semantic-analysis layer can be added later only where rules cannot reliably interpret natural-language bounty terms.

## Data Flow
1. Caller submits a public bounty URL.
2. URL is normalized and allowlisted to supported public sources.
3. Adapter retrieves source material with bounded timeouts and rate-limit handling.
4. Rule engine derives structured facts.
5. Evidence builder verifies each derived field has support or marks it unknown.
6. The service returns JSON; paid production access is gated by x402.

## Monetization
Initial target price: approximately $0.01-$0.05 USDC per verification, with `fast` cheaper than `deep`. Pricing should be configurable without code changes.

The goal is volume rather than a large per-call margin. Free health/demo output proves the service works without giving away full verification.

The service may later offer batch verification for agent operators, but subscriptions, token issuance, and speculative financial products are out of scope for MVP.

## Deployment
Prefer a free-tier edge deployment with a public HTTPS endpoint and no paid database requirement. Secrets such as provider API tokens belong only in platform secret storage, never in the repository.

The x402 receiving address is supplied only when payment configuration is activated. The application never requests or stores a wallet seed phrase or private key.

## Failure Handling
- Unsupported/malformed URL: 400 with structured error.
- Source missing/private: return `unverified` with reason; do not invent facts.
- GitHub/API rate limit: bounded retry where appropriate, then 503 with retry hint.
- Conflicting payout statements: return both pieces of evidence and downgrade funding confidence.
- Payment-gate failure: do not run the paid verification path.
- Parser uncertainty: preserve raw evidence and return `unknown` instead of guessing.

## Testing
Start test-first. Unit tests cover URL normalization, reward parsing, speculative-language detection, crowding thresholds, upfront-cost flags, AI-policy flags, conflicting evidence, and verdict selection.

Adapter tests use recorded fixtures/mocks so CI does not depend on live GitHub. Integration tests exercise `/health`, unpaid `/verify` behavior, paid-gate behavior, and representative bounty fixtures from clean, crowded, speculative, and underfunded cases.

Before release: run typecheck, lint, unit tests, integration tests, and a live smoke test against public issues whose expected classifications are already known.

## Safety and Trust
The service must not claim that a bounty will pay. It distinguishes source facts from derived workflow classifications and shows evidence.

It will not automate deception, fake engagement, wash trading, credential sharing, wallet signing, or unauthorized security testing. Security bounties may be classified, but exploit execution is not part of this product.

## MVP Boundary
Version 0.1 supports GitHub issue URLs only, one verification at a time, JSON output, deterministic analysis, configurable pricing, and x402-compatible payment gating.

Not in MVP: token launch, trading execution, portfolio advice, multi-chain wallet custody, user accounts, subscription billing, arbitrary web crawling, or an LLM-based scoring engine.

## Initial Build Sequence
1. Scaffold TypeScript service and tests.
2. Implement deterministic verifier against fixtures.
3. Add GitHub public-source adapter.
4. Add HTTP API and evidence schema.
5. Add x402 payment adapter behind a feature flag.
6. Deploy free-tier endpoint, run live acceptance checks, then list the service in appropriate x402 directories.
