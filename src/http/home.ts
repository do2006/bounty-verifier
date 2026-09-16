export function homePageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BountyVerifier API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:820px;margin:48px auto;padding:0 20px;line-height:1.55">
<h1>BountyVerifier</h1>
<p>Evidence-backed verification for public GitHub bounties before you spend hours coding.</p>
<p><strong>Paid verification:</strong> $0.005 USDC on Base via x402.</p>
<h2>Endpoints</h2>
<ul>
<li><code>GET /health</code> — service status</li>
<li><code>GET /demo</code> — free example result</li>
<li><code>POST /verify</code> — paid live verification</li>
</ul>
<p>The verifier checks stated reward terms, payout condition, competition, upfront-cost flags, AI-policy conflicts, and obvious speculative or unfunded language. Results are evidence-backed classifications, not guarantees of payment.</p>
</body></html>`;
}
