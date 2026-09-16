const origin = 'https://bounty-verifier-api.planet-teacher.workers.dev';

const verifyResultSchema = {
  type: 'object',
  properties: {
    sourceUrl: { type: 'string', format: 'uri' },
    repository: { type: 'string' },
    issueNumber: { type: 'integer' },
    reward: { type: ['object', 'null'] },
    payoutCondition: { type: ['string', 'null'] },
    fundingConfidence: { type: 'string' },
    upfrontCosts: { type: 'array', items: { type: 'string' } },
    aiPolicy: { type: 'string' },
    competition: { type: 'object' },
    verdict: { type: 'string' },
  },
};

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BountyVerifier API',
      version: '0.1.0',
      description: 'Evidence-backed verification of public GitHub bounty issues for agents and developers.',
      contact: { email: 'dwayneoneill@nightfalltechnologies.com' },
      'x-guidance': 'Call POST /verify with a public GitHub issue URL. The endpoint is paid with x402 USDC on Base.',
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'AI', description: 'Agent-facing decision support.' },
      { name: 'Utility', description: 'Developer and bounty workflow utilities.' },
    ],
    paths: {
      '/verify': {
        post: {
          tags: ['AI', 'Utility'],
          summary: 'Verify a public GitHub bounty issue',
          description: 'Checks reward wording, payout condition, crowding, upfront costs, and AI-policy friction before work begins.',
          operationId: 'verifyBounty',
          'x-payment-info': {
            protocols: ['x402'],
            pricingMode: 'fixed',
            price: '0.02',
            currency: 'USD',
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri', description: 'Public GitHub issue URL.' },
                  },
                  required: ['url'],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Bounty verification result.',
              content: { 'application/json': { schema: verifyResultSchema } },
            },
            '400': { description: 'Invalid or unsupported GitHub issue URL.' },
            '402': {
              description: 'x402 payment required before verification runs.',
              headers: {
                'Payment-Required': {
                  description: 'Base64-encoded x402 v2 payment requirements.',
                  schema: { type: 'string' },
                },
                'Cache-Control': {
                  description: 'Payment challenges are not cacheable.',
                  schema: { type: 'string', example: 'no-store' },
                },
              },
            },
            '502': { description: 'GitHub upstream error.' },
            '503': { description: 'GitHub rate limit or transient upstream failure.' },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Utility'], summary: 'Service health', security: [],
          responses: { '200': { description: 'Service is healthy.' } },
        },
      },
      '/demo': {
        get: {
          tags: ['Utility'], summary: 'Free example verification result', security: [],
          responses: { '200': { description: 'Example response.' } },
        },
      },
      '/openapi.json': {
        get: {
          tags: ['Utility'], summary: 'OpenAPI discovery document', security: [],
          responses: { '200': { description: 'OpenAPI 3.1 document.' } },
        },
      },
      '/.well-known/x402': {
        get: {
          tags: ['Utility'], summary: 'x402 discovery manifest', security: [],
          responses: { '200': { description: 'x402 discovery metadata.' } },
        },
      },
      '/': {
        get: {
          tags: ['Utility'], summary: 'BountyVerifier landing page', security: [],
          responses: { '200': { description: 'Human-readable service overview.' } },
        },
      },
    },
    externalDocs: {
      description: 'Source and API documentation',
      url: 'https://github.com/do2006/bounty-verifier',
    },
  };
}
