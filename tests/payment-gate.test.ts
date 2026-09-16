import { describe, expect, test } from 'vitest';
import { loadPaymentConfig } from '../src/payment/config.js';

const receiver = '0x1111111111111111111111111111111111111111';

describe('loadPaymentConfig', () => {
  test('stays disabled when PAYMENTS_ENABLED is not true', () => {
    const config = loadPaymentConfig({ X402_RECEIVER: receiver });
    expect(config.enabled).toBe(false);
  });

  test('fails closed when enabled without a receiver', () => {
    const config = loadPaymentConfig({ PAYMENTS_ENABLED: 'true' });
    expect(config.enabled).toBe(false);
    if (config.enabled) throw new Error('expected disabled payment config');
    expect(config.reason).toBe('missing_receiver');
  });

  test('builds Base mainnet USDC config when enabled', () => {
    const config = loadPaymentConfig({
      PAYMENTS_ENABLED: 'true',
      X402_RECEIVER: receiver,
    });
    expect(config).toMatchObject({
      enabled: true,
      receiver,
      network: 'eip155:8453',
      price: '$0.005',
      deepPrice: '$0.05',
    });
  });
});
