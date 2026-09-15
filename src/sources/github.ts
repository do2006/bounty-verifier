import type { BountySnapshot } from '../domain/types.js';
import { parseGitHubIssueUrl } from './url.js';

export class GitHubSourceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GitHubSourceError';
  }
}

interface GitHubIssueResponse {
  title?: string;
  body?: string | null;
  comments?: number;
  assignees?: Array<{ login?: string }> | null;
  labels?: Array<string | { name?: string }>;
}

interface GitHubCommentResponse {
  body?: string | null;
}

interface GitHubSearchResponse {
  total_count?: number;
}

interface GitHubContentResponse {
  content?: string;
}

function retryableStatus(status: number): boolean {
  return status === 0 || status === 403 || status === 429 || status >= 500;
}

async function requestJson<T>(
  url: string,
  fetchImpl: typeof fetch,
  allowNotFound = false,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      throw new GitHubSourceError(
        `GitHub request failed with HTTP ${response.status}`,
        response.status,
        retryableStatus(response.status),
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof GitHubSourceError) throw error;
    throw new GitHubSourceError('GitHub request failed before a response was received', 0, true);
  } finally {
    clearTimeout(timer);
  }
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function fetchContributionPolicy(
  apiBase: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  for (const path of ['CONTRIBUTING.md', '.github/CONTRIBUTING.md']) {
    const result = await requestJson<GitHubContentResponse>(
      `${apiBase}/contents/${path}`,
      fetchImpl,
      true,
    );
    if (result?.content) return decodeBase64Utf8(result.content);
  }
  return null;
}

function labelName(label: string | { name?: string }): string | null {
  if (typeof label === 'string') return label;
  return label.name ?? null;
}

export async function fetchGitHubSnapshot(
  issueUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BountySnapshot> {
  const ref = parseGitHubIssueUrl(issueUrl);
  const apiBase = `https://api.github.com/repos/${ref.owner}/${ref.repo}`;
  const issue = await requestJson<GitHubIssueResponse>(
    `${apiBase}/issues/${ref.issueNumber}`,
    fetchImpl,
  );
  if (!issue) throw new GitHubSourceError('GitHub issue was not found', 404, false);

  const searchQuery = encodeURIComponent(
    `repo:${ref.owner}/${ref.repo} is:pr is:open "#${ref.issueNumber}"`,
  );
  const [comments, search, contributionPolicy] = await Promise.all([
    requestJson<GitHubCommentResponse[]>(
      `${apiBase}/issues/${ref.issueNumber}/comments?per_page=100`,
      fetchImpl,
    ),
    requestJson<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${searchQuery}&per_page=100`,
      fetchImpl,
    ),
    fetchContributionPolicy(apiBase, fetchImpl),
  ]);

  return {
    sourceUrl: ref.normalizedUrl,
    repository: `${ref.owner}/${ref.repo}`,
    issueNumber: ref.issueNumber,
    title: issue.title ?? '',
    body: issue.body ?? '',
    comments: (comments ?? []).flatMap((comment) => (comment.body ? [comment.body] : [])),
    commentCount: issue.comments ?? (comments ?? []).length,
    assignees: (issue.assignees ?? []).flatMap((assignee) =>
      assignee.login ? [assignee.login] : [],
    ),
    openRelatedPrCount: search?.total_count ?? 0,
    labels: (issue.labels ?? []).flatMap((label) => {
      const name = labelName(label);
      return name ? [name] : [];
    }),
    contributionPolicy,
    retrievedAt: new Date().toISOString(),
  };
}
