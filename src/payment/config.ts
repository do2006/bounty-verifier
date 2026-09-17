export interface PaymentEnv {
  PAYMENTS_ENABLED?: string;
  X402_RECEIVER?: string;
  X402_FACILITATOR_URL?: string;
  X402_NETWORK?: string;
  X402_PRICE?: string;
  X402_DEEP_PRICE?: string;
  NOHUMANS_CLAIM_TOKEN?: string;
}

export type PaymentConfig =
  | { enabled: false; reason: 'disabled' | 'missing_receiver' | 'invalid_receiver' }
  | {
      enabled: true;
      receiver: string;
      facilitatorUrl: string;
      network: string;
      price: string;
      deepPrice: string;
    };

export function loadPaymentConfig(env: PaymentEnv): PaymentConfig {
  if (env.PAYMENTS_ENABLED !== 'true') return { enabled: false, reason: 'disabled' };

  const receiver = env.X402_RECEIVER?.trim();
  if (!receiver) return { enabled: false, reason: 'missing_receiver' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(receiver)) {
    return { enabled: false, reason: 'invalid_receiver' };
  }

  return {
    enabled: true,
    receiver,
    facilitatorUrl: env.X402_FACILITATOR_URL ?? 'https://facilitator.payai.network',
    network: env.X402_NETWORK ?? 'eip155:8453',
    price: env.X402_PRICE ?? '$0.005',
    deepPrice: env.X402_DEEP_PRICE ?? '$0.05',
  };
}
