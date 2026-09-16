const baseUrl = 'https://bounty-verifier-api.planet-teacher.workers.dev';

async function showDemo() {
  const response = await fetch(`${baseUrl}/demo`);
  if (!response.ok) throw new Error(`demo failed: ${response.status}`);
  console.log(await response.json());
}

async function requestVerification(issueUrl: string) {
  const response = await fetch(`${baseUrl}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: issueUrl }),
  });

  if (response.status === 402) {
    console.log('x402 payment required:', response.headers.get('payment-required'));
    return;
  }

  if (!response.ok) throw new Error(`verify failed: ${response.status}`);
  console.log(await response.json());
}

await showDemo();
await requestVerification('https://github.com/owner/repo/issues/123');
