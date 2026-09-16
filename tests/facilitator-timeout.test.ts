import { describe,expect,it } from 'vitest';
import { createFacilitatorClient } from '../src/payment/x402.js';

describe('facilitator settlement deadline',()=>{
 it('allows Base settlement up to the current x402 90 second facilitator window',()=>{
  const client=createFacilitatorClient('https://facilitator.payai.network');
  expect((client as unknown as {timeoutMs:number}).timeoutMs).toBe(90_000);
 });
});