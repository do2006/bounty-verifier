# BountyVerifier

BountyVerifier is a small x402-paid API that analyzes public GitHub bounty issues before an agent or developer spends time implementing them.

It returns deterministic, evidence-oriented signals for:
- stated reward and payout condition
- funding confidence
- competition and related open PRs
- assignment / claim friction
- upfront stake, deposit, paid-credit, or gas requirements
- AI/contributor-policy conflicts
- an operational verdict: `pursue`, `crowded`, `blocked`, or `unverified`

## Live API

Base URL: `https://bounty-verifier-api.planet-teacher.workers.dev`

Free endpoints:
- `GET /` — buyer-facing landing page
- `GET /health` — service status
- `GET /demo` — sample verification output

Paid endpoint:
- `POST /verify` — **$0.02 USDC on Base mainnet via x402**

## Quick checks

```bash
curl https://bounty-verifier-api.planet-teacher.workers.dev/health
curl https://bounty-verifier-api.planet-teacher.workers.dev/demo
```

An unpaid verification request returns HTTP `402 Payment Required` with an x402 v2 payment requirement and Bazaar discovery metadata:

```bash
curl -i -X POST \
  https://bounty-verifier-api.planet-teacher.workers.dev/verify \
  -H 'content-type: application/json' \
  -d '{"url":"https://github.com/owner/repo/issues/123"}'
```

A compatible x402 client can satisfy that payment and retry the request automatically.

## Trust model

BountyVerifier does not guarantee that a bounty will pay. It distinguishes source facts from derived workflow classifications and returns `unknown`/`unverified` rather than inventing missing facts.

It never needs a wallet seed phrase or private key. The server only publishes a public USDC receiving address in the x402 payment requirements.

See [`docs/API.md`](docs/API.md) for the response contract and [`docs/LAUNCH.md`](docs/LAUNCH.md) for directory-ready listing metadata.
