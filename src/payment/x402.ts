import type { MiddlewareHandler } from 'hono';
import { HonoAdapter, paymentMiddleware } from '@x402/hono';
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type FacilitatorClient,
  type HTTPRequestContext,
} from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { ExactEvmScheme, registerExactEvmScheme } from '@x402/evm/exact/server';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import type { PaymentConfig } from './config.js';

const description = 'Verify whether a public GitHub bounty is actionable, funded-looking, and low-friction.';
const deepDescription = 'Deep GitHub bounty report with evidence, claim state, effort estimate, payout rail, and risk reasons.';

export function createFacilitatorClient(url: string): HTTPFacilitatorClient {
  return new HTTPFacilitatorClient({ url, timeoutMs: 90_000 });
}

export function createX402PaymentMiddleware(
  config: Extract<PaymentConfig, { enabled: true }>,
  facilitator?: FacilitatorClient,
): MiddlewareHandler {
  const facilitatorClient = facilitator ?? createFacilitatorClient(config.facilitatorUrl);

  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server, { networks: [config.network as Network] });
  const priceParser = new ExactEvmScheme();

  const discovery = declareDiscoveryExtension({
    bodyType: 'json',
    input: { url: 'https://github.com/x402-foundation/x402/issues/803' },
    inputSchema: {
      properties: {
        url: {
          type: 'string',
          description: 'Public GitHub issue URL to verify.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    output: {
      example: {
        sourceUrl: 'https://github.com/x402-foundation/x402/issues/803',
        reward: { amount: 20, currency: 'USDC' },
        fundingConfidence: 'stated_not_verified',
        verdict: 'pursue',
      },
    },
  });

  const routes = {
    'GET /verify': {
      accepts: [{ scheme: 'exact' as const, price: config.price, network: config.network as Network, payTo: config.receiver }],
      description, mimeType: 'application/json',
      unpaidResponseBody: async (context: HTTPRequestContext) => {
        const parsedPrice = await priceParser.parsePrice(config.price, config.network as Network);
        return { contentType: 'application/json', body: { x402Version: 2, error: 'Payment required', resource: { url: context.adapter.getUrl(), description, mimeType: 'application/json' }, accepts: [{ scheme: 'exact', network: config.network, amount: parsedPrice.amount, asset: parsedPrice.asset, payTo: config.receiver, maxTimeoutSeconds: 300, extra: parsedPrice.extra }] } };
      },
    },
    'GET /verify/deep': {
      accepts: [{ scheme: 'exact' as const, price: config.deepPrice, network: config.network as Network, payTo: config.receiver }],
      description: deepDescription, mimeType: 'application/json',
      unpaidResponseBody: async (context: HTTPRequestContext) => {
        const parsedPrice = await priceParser.parsePrice(config.deepPrice, config.network as Network);
        return { contentType: 'application/json', body: { x402Version: 2, error: 'Payment required', resource: { url: context.adapter.getUrl(), description: deepDescription, mimeType: 'application/json' }, accepts: [{ scheme: 'exact', network: config.network, amount: parsedPrice.amount, asset: parsedPrice.asset, payTo: config.receiver, maxTimeoutSeconds: 300, extra: parsedPrice.extra }] } };
      },
    },
    'GET /': {
      accepts: [{ scheme: 'exact' as const, price: config.price, network: config.network as Network, payTo: config.receiver }],
      description: 'Access BountyVerifier service metadata and paid API entry point.',
      mimeType: 'text/html',
      unpaidResponseBody: async (context: HTTPRequestContext) => {
        const parsedPrice = await priceParser.parsePrice(config.price, config.network as Network);
        return { contentType: 'application/json', body: {
          x402Version: 2, error: 'Payment required',
          resource: { url: context.adapter.getUrl(), description: 'Access BountyVerifier service metadata and paid API entry point.', mimeType: 'text/html' },
          accepts: [{ scheme: 'exact', network: config.network, amount: parsedPrice.amount, asset: parsedPrice.asset, payTo: config.receiver, maxTimeoutSeconds: 300, extra: parsedPrice.extra }],
        } };
      },
    },
    'POST /verify/deep': {
      accepts: [{ scheme: 'exact' as const, price: config.deepPrice, network: config.network as Network, payTo: config.receiver }],
      description: deepDescription,
      mimeType: 'application/json',
      extensions: discovery,
      unpaidResponseBody: async (context: HTTPRequestContext) => {
        const parsedPrice = await priceParser.parsePrice(config.deepPrice, config.network as Network);
        return { contentType: 'application/json', body: {
          x402Version: 2, error: 'Payment required',
          resource: {
            url: context.adapter.getUrl(),
            description: deepDescription,
            mimeType: 'application/json',
          },
          accepts: [{
            scheme: 'exact', network: config.network, amount: parsedPrice.amount,
            asset: parsedPrice.asset, payTo: config.receiver, maxTimeoutSeconds: 300, extra: parsedPrice.extra,
          }],
          extensions: server.enrichExtensions(discovery, context),
        } };
      },
    },
    'POST /verify': {
      accepts: [
        {
          scheme: 'exact' as const,
          price: config.price,
          network: config.network as Network,
          payTo: config.receiver,
        },
      ],
      description,
      mimeType: 'application/json',
      unpaidResponseBody: async (context: HTTPRequestContext) => {
        const parsedPrice = await priceParser.parsePrice(
          config.price,
          config.network as Network,
        );
        return {
          contentType: 'application/json',
          body: {
            x402Version: 2,
            error: 'Payment required',
            resource: {
              url: context.adapter.getUrl(),
              description,
              mimeType: 'application/json',
            },
            accepts: [
              {
                scheme: 'exact',
                network: config.network,
                amount: parsedPrice.amount,
                asset: parsedPrice.asset,
                payTo: config.receiver,
                maxTimeoutSeconds: 300,
                extra: parsedPrice.extra,
              },
            ],
          },
        };
      },
    },
  };

  const protocolMiddleware = paymentMiddleware(routes, server, undefined, undefined, false);
  let facilitatorInitialization: Promise<void> | null = null;

  const ensureFacilitatorInitialized = async () => {
    if (!facilitatorInitialization) {
      facilitatorInitialization = server.initialize().catch((error) => {
        facilitatorInitialization = null;
        throw error;
      });
    }
    await facilitatorInitialization;
  };

  const buildLocalChallenge = async (context: HTTPRequestContext) => {
    const route = `${context.method.toUpperCase()} ${context.path}`;
    let price: string;
    let routeDescription: string;
    let mimeType = 'application/json';
    let extensions: typeof discovery | undefined;

    switch (route) {
      case 'GET /':
        price = config.price;
        routeDescription = 'Access BountyVerifier service metadata and paid API entry point.';
        mimeType = 'text/html';
        break;
      case 'GET /verify':
      case 'POST /verify':
        price = config.price;
        routeDescription = description;
        break;
      case 'GET /verify/deep':
        price = config.deepPrice;
        routeDescription = deepDescription;
        break;
      case 'POST /verify/deep':
        price = config.deepPrice;
        routeDescription = deepDescription;
        extensions = discovery;
        break;
      default:
        return null;
    }

    const parsedPrice = await priceParser.parsePrice(price, config.network as Network);
    const body: Record<string, unknown> = {
      x402Version: 2,
      error: 'Payment required',
      resource: {
        url: context.adapter.getUrl(),
        description: routeDescription,
        mimeType,
      },
      accepts: [{
        scheme: 'exact',
        network: config.network,
        amount: parsedPrice.amount,
        asset: parsedPrice.asset,
        payTo: config.receiver,
        maxTimeoutSeconds: 300,
        extra: parsedPrice.extra,
      }],
    };
    if (extensions) body.extensions = server.enrichExtensions(extensions, context);
    return body;
  };

  return async (c, next) => {
    const paymentHeader = c.req.header('payment-signature') || c.req.header('x-payment');
    const context: HTTPRequestContext = {
      adapter: new HonoAdapter(c),
      path: c.req.path,
      method: c.req.method,
      ...(paymentHeader ? { paymentHeader } : {}),
    };
    const challenge = await buildLocalChallenge(context);

    if (challenge && !paymentHeader) {
      c.header('payment-required', Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64'));
      c.header('Cache-Control', 'no-store');
      return c.json(challenge, 402);
    }

    if (challenge && paymentHeader) {
      try {
        await ensureFacilitatorInitialized();
      } catch (error) {
        console.error('Failed to initialize x402 facilitator for paid request:', error);
        return c.json({ error: 'Payment facilitator unavailable.' }, 502);
      }
    }

    return protocolMiddleware(c, next);
  };
}
