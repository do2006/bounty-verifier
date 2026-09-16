export const x402Manifest = {
  x402Version: 2,
  kind: 'resource-server',
  name: 'BountyVerifier',
  description: 'Preflight public GitHub bounties for funding, competition, policy, and execution friction.',
  resources: [
    {
      url: 'https://bounty-verifier-api.planet-teacher.workers.dev/verify',
      resource: 'POST /verify',
      method: 'POST',
      description: 'Analyze one public GitHub bounty issue before implementation begins.',
      price: '$0.005',
      tags: ['github', 'bounties', 'developer-tools', 'agents'],
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public GitHub issue URL to verify.' },
        },
        required: ['url'],
        additionalProperties: false,
      },
      outputSchema: { type: 'object' },
    },
    {
      url: 'https://bounty-verifier-api.planet-teacher.workers.dev/verify/deep',
      resource: 'POST /verify/deep',
      method: 'POST',
      description: 'Deep GitHub bounty report with evidence, claim state, effort estimate, payout rail, and risk reasons.',
      price: '$0.05',
      tags: ['github', 'bounties', 'developer-tools', 'agents', 'deep-analysis'],
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Public GitHub issue URL to verify.' } },
        required: ['url'],
        additionalProperties: false,
      },
      outputSchema: { type: 'object' },
    },
  ],
  freeResources: [
    { resource: 'GET /health', price: 'free' },
    { resource: 'GET /demo', price: 'free' },
  ],
  docs: 'https://github.com/do2006/bounty-verifier',
  attestation: { type: 'none' },
  updated: '2026-09-16T00:00:00Z',
} as const;
