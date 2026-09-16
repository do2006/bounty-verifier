import { describe,expect,it } from 'vitest';
import { createX402PaymentMiddleware } from '../src/payment/x402.js';
import { createApp } from '../src/http/app.js';

const config={enabled:true as const,receiver:'0xf77f3C9e6BC9Cd0eE1A2943813b6eC57f1305Ab3',facilitatorUrl:'https://facilitator.test',network:'eip155:8453',price:'$0.005',deepPrice:'$0.05'};

describe('reference SDK resource compatibility',()=>{
 it('advertises only portable x402 ResourceInfo fields on POST /verify',async()=>{
  const facilitator={getSupported:async()=>({kinds:[{x402Version:2,scheme:'exact',network:'eip155:8453'}],extensions:[],signers:{}}),verify:async()=>({isValid:true,payer:'0x0000000000000000000000000000000000000001'}),settle:async()=>({success:true,transaction:'0x1',network:'eip155:8453',payer:'0x0000000000000000000000000000000000000001'})};
  const app=createApp({paymentMiddleware:createX402PaymentMiddleware(config,facilitator as never)});
  const res=await app.request('/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:'https://github.com/x402-foundation/x402/issues/803'})});
  const body=await res.json() as {resource:Record<string,unknown>};
  expect(Object.keys(body.resource).sort()).toEqual(['description','mimeType','url']);
 });
});