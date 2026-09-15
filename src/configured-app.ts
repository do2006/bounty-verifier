import type { MiddlewareHandler } from 'hono';
import { createApp } from './http/app.js';
import {
  loadPaymentConfig,
  type PaymentConfig,
  type PaymentEnv,
} from './payment/config.js';
import { createX402PaymentMiddleware } from './payment/x402.js';

type EnabledPaymentConfig = Extract<PaymentConfig, { enabled: true }>;
type MiddlewareFactory = (config: EnabledPaymentConfig) => MiddlewareHandler;

export function createConfiguredApp(
  env: PaymentEnv,
  middlewareFactory: MiddlewareFactory = createX402PaymentMiddleware,
) {
  const payment = loadPaymentConfig(env);
  if (!payment.enabled) {
    return createApp({ paidVerification: false });
  }

  return createApp({
    paidVerification: true,
    paymentMiddleware: middlewareFactory(payment),
  });
}
