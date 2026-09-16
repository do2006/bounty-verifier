# BountyVerifier Zero-Cost Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Maximize legitimate paid x402 traffic to BountyVerifier without any owner-funded cost.

**Architecture:** Preserve the deployed Cloudflare Worker and its two paid routes. Improve only standards-compliant discovery metadata and submit/refresh the existing service across free x402 catalogs; verify revenue directly on Base USDC.

**Tech Stack:** Cloudflare Workers, TypeScript, x402 v2, Base mainnet, Circle USDC, public marketplace APIs/web endpoints.

**Spec:** User-approved chat design, 2026-09-15.

## Global Constraints
- Owner pays $0 upfront: no gas, deposits, subscriptions, listing fees, staking, wallet funding, or paid APIs.
- Preserve POST /verify at $0.005 USDC and POST /verify/deep at $0.05 USDC.
- Preserve Base eip155:8453 and the existing receiving address; never request private keys or seed phrases.
- Do not create a duplicate PayAPI listing while its existing listing is pending review.
- Do not claim revenue until external Base USDC settlement is verified.
- Keep /health and /demo free and do not break the production Worker.

---

### Task 1: Audit live discovery
- [ ] Query live OpenAPI/x402 metadata and each known marketplace's public status/discovery endpoint.
- [ ] Record which catalogs expose /verify, /verify/deep, or neither.
- [ ] Identify only zero-cost refresh/registration actions.

### Task 2: Repair discovery gaps
- [ ] For each free marketplace, refresh/update the existing registration or submit the premium resource when supported.
- [ ] Do not duplicate PayAPI; check its existing review status only.
- [ ] Re-query catalogs to verify observable results.

### Task 3: Standards metadata improvements
- [ ] If discovery gaps are caused by our metadata, write a failing test first.
- [ ] Make the smallest standards-compliant metadata change, then run focused tests.
- [ ] Run npm test, typecheck, lint, build, deploy, and live verification before commit/push.

### Task 4: Revenue truth
- [ ] Query Circle Base USDC balance/transfer evidence for the receiving address using public chain data.
- [ ] Report actual settled revenue only; otherwise retain $0.00 confirmed revenue.
- [ ] Leave the service live and ready for external paid calls.