import { describe, expect, test, vi } from 'vitest';
import { Hono } from 'hono';
import type { FacilitatorClient } from '@x402/core/server';
import { createX402PaymentMiddleware } from '../src/payment/x402.js';

const config={enabled:true as const,receiver:'0x1111111111111111111111111111111111111111',facilitatorUrl:'https://example.invalid',network:'eip155:8453',price:'$0.005',deepPrice:'$0.05'};

describe('x402 extension echo',()=>{
 test('accepts the exact extensions map from the immediately preceding challenge',async()=>{
  const verify=vi.fn(async()=>({isValid:false,invalidReason:'facilitator_reached'}));
  const facilitator:FacilitatorClient={getSupported:async()=>({kinds:[{x402Version:2,scheme:'exact',network:'eip155:8453'}],extensions:['bazaar'],signers:{}}),verify,settle:async()=>{throw new Error('not reached')}};
  const app=new Hono(); app.use('/verify',createX402PaymentMiddleware(config,facilitator)); app.post('/verify',c=>c.json({ok:true}));
  const requestBody=JSON.stringify({url:'https://github.com/x402-foundation/x402/issues/803'});
  const first=await app.request('/verify',{method:'POST',headers:{'content-type':'application/json'},body:requestBody});
  const challenge=await first.json() as any;
  const payload={x402Version:2,accepted:challenge.accepts[0],payload:{},extensions:challenge.extensions};
  const signature=Buffer.from(JSON.stringify(payload)).toString('base64');
  const second=await app.request('/verify',{method:'POST',headers:{'content-type':'application/json','payment-signature':signature},body:requestBody});
  const result=await second.json() as any;
  expect(second.status).toBe(402);
  expect(verify).toHaveBeenCalledOnce();
  expect(result.error).not.toBe('extension_echo_mismatch');
 });
});