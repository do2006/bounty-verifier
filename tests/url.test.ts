import { describe, expect, test } from 'vitest';
import { parseGitHubIssueUrl } from '../src/sources/url.js';

describe('parseGitHubIssueUrl', () => {
  test('normalizes a public GitHub issue URL', () => {
    expect(parseGitHubIssueUrl('https://github.com/acme/widgets/issues/7')).toEqual({
      owner: 'acme',
      repo: 'widgets',
      issueNumber: 7,
      normalizedUrl: 'https://github.com/acme/widgets/issues/7',
    });
  });

  test('removes query strings and comment fragments', () => {
    expect(parseGitHubIssueUrl('https://github.com/acme/widgets/issues/7?foo=bar#issuecomment-123')).toEqual({
      owner: 'acme',
      repo: 'widgets',
      issueNumber: 7,
      normalizedUrl: 'https://github.com/acme/widgets/issues/7',
    });
  });

  test.each([
    'ftp://github.com/acme/widgets/issues/7',
    'https://evil.example/acme/widgets/issues/7',
    'https://github.com/acme/widgets/pull/7',
    'https://github.com/acme/widgets',
  ])('rejects unsupported URL %s', (url) => {
    expect(() => parseGitHubIssueUrl(url)).toThrow('Unsupported GitHub issue URL');
  });
});
