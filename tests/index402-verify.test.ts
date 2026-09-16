import { describe, expect, test } from 'vitest';
import { createApp } from '../src/http/app.js';

describe('402 Index domain verification', () => {
  test('serves the public verification hash without payment', async () => {
    const response = await createApp().request('/.well-known/402index-verify.txt');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe('5b4119eb754de64d25c1cb326eabd49d40085e4331c84804551f667128ed081c');
  });
});