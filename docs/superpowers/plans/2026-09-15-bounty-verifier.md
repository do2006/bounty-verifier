# BountyVerifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, test-covered GitHub bounty verification API that can later charge per verification through x402/USDC without requiring upfront spend.

**Architecture:** A TypeScript edge-style service separates source retrieval, deterministic rule evaluation, evidence construction, and HTTP/payment concerns. The verifier is useful without an LLM, returns explicit unknowns instead of guesses, and keeps payment gating behind an adapter so the core can run and be tested before a wallet is configured.

**Tech Stack:** TypeScript, Node.js 20+, Vitest, Hono-compatible HTTP handlers, native `fetch`, optional x402 middleware behind a feature flag.

**Spec:** `docs/superpowers/specs/2026-09-15-bounty-verifier-design.md`

## Global Constraints

- GitHub issue URLs only in v0.1.
- No wallet custody, transaction signing, seed phrases, or private keys.
- No LLM dependency in the first release.
- Every nontrivial result must carry evidence or be marked `unknown`/`unverified`.
- Unsupported or private sources must fail closed rather than fabricate facts.
- Paid access must remain disabled until a public receiving address is configured.
- Deployment must be possible on a free tier.

---

### Task 1: Core verifier and rule engine
**Files:**
- Create: `package.json`, `tsconfig.json`, `src/domain/types.ts`, `src/domain/rules.ts`, `src/domain/verify.ts`
- Test: `tests/rules.test.ts`, `tests/verify.test.ts`

**Interfaces:**
- Produces `BountySnapshot`, `VerificationResult`, `Evidence`, `classifySnapshot(snapshot)` and `verifySnapshot(snapshot)`.
- Later tasks supply `BountySnapshot` from live GitHub data and expose `verifySnapshot()` over HTTP.

- [ ] **Step 1: Write failing tests** for reward parsing, speculative wording, upfront-cost flags, crowding, AI-policy conflicts, and verdict selection using literal in-memory snapshots.

```ts
expect(verifySnapshot(clean)).toMatchObject({ verdict: 'pursue' });
expect(verifySnapshot(crowded)).toMatchObject({ verdict: 'crowded' });
expect(verifySnapshot(staked)).toMatchObject({ verdict: 'blocked' });
```

- [ ] **Step 2: Run `npm test -- tests/rules.test.ts tests/verify.test.ts`** and confirm failure is caused by missing verifier code.
- [ ] **Step 3: Implement the minimal typed rule engine** with deterministic regex/string checks and explicit `unknown` values; do not add network code.
- [ ] **Step 4: Re-run the focused tests** and then `npm test`; all must pass with no warnings.
- [ ] **Step 5: Commit** with `feat: add deterministic bounty verifier`.

### Task 2: GitHub source adapter

**Files:**
- Create: `src/sources/github.ts`, `src/sources/url.ts`
- Test: `tests/github-source.test.ts`, `tests/url.test.ts`, `tests/fixtures/github/*.json`
**Interfaces:**
- Consumes a public GitHub issue URL.
- Produces `parseGitHubIssueUrl(url)` and `fetchGitHubSnapshot(url, fetchImpl)` returning the core `BountySnapshot` plus evidence.

- [ ] **Step 1: Write failing URL tests** for valid issue URLs, nested URLs, malformed hosts, non-issue GitHub URLs, and unsupported schemes.
- [ ] **Step 2: Write failing adapter tests** against recorded JSON fixtures for issue metadata, comments, assignees, reward language, and related open PR counts.
- [ ] **Step 3: Run `npm test -- tests/url.test.ts tests/github-source.test.ts`** and verify RED for missing adapter behavior.
- [ ] **Step 4: Implement URL normalization and bounded GitHub retrieval** using native `fetch`, `Accept: application/vnd.github+json`, 10-second abort timeout, and a maximum of 100 comments/PR search hits per request.

```ts
export async function fetchGitHubSnapshot(
  issueUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BountySnapshot> { /* fixture-driven implementation */ }
```

- [ ] **Step 5: Add fail-closed handling** for 403/404/429/5xx so the returned result is `unverified` or a typed retryable error, never guessed data.
- [ ] **Step 6: Run focused tests and full `npm test`**; all green.
- [ ] **Step 7: Commit** with `feat: add GitHub bounty source adapter`.

### Task 3: Public HTTP API

**Files:**
- Create: `src/http/app.ts`, `src/http/errors.ts`, `src/index.ts`
- Test: `tests/http.test.ts`

**Interfaces:**
- Consumes `fetchGitHubSnapshot()` and `verifySnapshot()`.
- Produces `createApp(deps)` with `GET /health`, `GET /demo`, and `POST /verify`.
- [ ] **Step 1: Write failing HTTP tests** for `/health`, `/demo`, valid `/verify`, malformed JSON, missing URL, unsupported URL, and retryable upstream failure.
- [ ] **Step 2: Run `npm test -- tests/http.test.ts`** and verify RED because the app does not exist.
- [ ] **Step 3: Implement the minimal Hono app** with JSON schema checks, stable error envelopes, request IDs, and no user account requirement.

```ts
app.get('/health', (c) => c.json({ ok: true, service: 'bounty-verifier', version: '0.1.0' }));
app.post('/verify', async (c) => { /* validate -> fetch -> verify -> json */ });
```

- [ ] **Step 4: Add a free `/demo` response** based on a bundled fixture so buyers can inspect output shape without consuming live GitHub quota.
- [ ] **Step 5: Run focused tests, full tests, and `npm run typecheck`**; all green.
- [ ] **Step 6: Commit** with `feat: expose bounty verifier HTTP API`.

### Task 4: Payment adapter and paid-mode boundary

**Files:**
- Create: `src/payment/gate.ts`, `src/config.ts`
- Modify: `src/http/app.ts`
- Test: `tests/payment-gate.test.ts`, `tests/http-payment.test.ts`

**Interfaces:**
- Produces `PaymentGate` with `isEnabled()` and `authorize(request)`; default implementation is disabled until `X402_RECEIVER` is present.
- HTTP `/verify` asks the gate before running live verification; `/health` and `/demo` stay free.

- [ ] **Step 1: Write failing tests** proving paid mode is off without a receiver, free routes remain accessible, and paid verification fails closed when authorization is absent.
- [ ] **Step 2: Run the focused tests** and verify RED for missing payment adapter.
- [ ] **Step 3: Implement a provider-neutral gate interface and disabled-mode implementation**; never generate, import, or store private wallet material.
- [ ] **Step 4: Research and pin the current x402 middleware package/API before enabling it**; integrate only the documented request/response flow and only with a public receiving address supplied by the owner.
- [ ] **Step 5: Add an x402-backed gate implementation behind `PAYMENTS_ENABLED=true`** so the service cannot accidentally demand payment before configuration is complete.
- [ ] **Step 6: Run payment tests, full tests, and typecheck**; all green.
- [ ] **Step 7: Commit** with `feat: add optional x402 payment gate`.

### Task 5: Deployment, smoke checks, and buyer-facing docs

**Files:**
- Create: `wrangler.toml` or equivalent free-tier deployment config, `README.md`, `docs/API.md`, `.env.example`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces a deployable HTTPS service and exact usage examples for human and agent buyers.

- [ ] **Step 1: Write a failing smoke test** that boots the built app and verifies `/health`, `/demo`, and a fixture-backed `/verify` request.
- [ ] **Step 2: Run the smoke test** and verify RED before deployment wiring exists.
- [ ] **Step 3: Add free-tier deployment configuration** with secrets referenced by environment name only; no tokens, addresses, or credentials committed.
- [ ] **Step 4: Write `README.md` and `docs/API.md`** with curl examples, response schema, evidence semantics, price/config description, and explicit non-guarantee language.
- [ ] **Step 5: Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`**; all must pass cleanly.
- [ ] **Step 6: Deploy to the free-tier target and run live smoke checks** against `/health` and `/demo`; activate `/verify` payment only after receiver configuration.
- [ ] **Step 7: Commit** with `chore: prepare BountyVerifier deployment`.

### Task 6: Launch/discovery package

**Files:**
- Create: `docs/LAUNCH.md`, `examples/agent-client.ts`
- Modify: `README.md`

**Interfaces:**
- Produces a concise listing description and a machine-usable client example suitable for x402/API directories.
- [ ] **Step 1: Write an agent client example** that calls `/demo` for discovery and `/verify` for paid/live verification using standard `fetch`.
- [ ] **Step 2: Write launch copy** describing the specific buyer pain, supported input, returned evidence, pricing band, and safety boundary without promising earnings or guaranteed bounty payment.
- [ ] **Step 3: Add directory-ready metadata**: service name, one-line description, categories (`developer-tools`, `research`, `github`, `agents`), endpoint URL, free demo URL, payment rail, and contact repository.
- [ ] **Step 4: Run build/tests again** and manually verify all documented commands against the deployed endpoint.
- [ ] **Step 5: Commit** with `docs: add BountyVerifier launch package`.

## Final Verification

- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Git working tree is clean.
- [ ] Live `/health` and `/demo` respond successfully.
- [ ] Paid mode remains disabled unless a public receiver address is configured.
- [ ] No secrets, wallet private material, or seed phrases exist anywhere in the repo or git history.
