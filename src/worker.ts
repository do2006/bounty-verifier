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
    return await appForEnv(env).fetch(request, env, ctx as never);
  },
};

export default worker;
