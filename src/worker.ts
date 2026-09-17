import { createConfiguredApp } from './configured-app.js';
import type { PaymentEnv } from './payment/config.js';

let cachedKey = '';
let cachedApp: ReturnType<typeof createConfiguredApp> | undefined;

function configKey(env: PaymentEnv): string {
  return [
    env.PAYMENTS_ENABLED ?? '',
    env.X402_RECEIVER ?? '',
    env.X402_FACILITATOR_URL ?? '',
    env.X402_NETWORK ?? '',
    env.X402_PRICE ?? '',
  ].join('|');
}

function appForEnv(env: PaymentEnv) {
  const key = configKey(env);
  if (!cachedApp || key !== cachedKey) {
    cachedApp = createConfiguredApp(env);
    cachedKey = key;
  }
  return cachedApp;
}

const worker = {
  async fetch(request: Request, env: PaymentEnv, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/.well-known/nohumans-claim' && env.NOHUMANS_CLAIM_TOKEN) {
      return new Response(env.NOHUMANS_CLAIM_TOKEN, {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    return await appForEnv(env).fetch(request, env, ctx as never);
  },
};

export default worker;
