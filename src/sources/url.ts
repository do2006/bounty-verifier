export interface GitHubIssueRef {
  owner: string;
  repo: string;
  issueNumber: number;
  normalizedUrl: string;
}

export function parseGitHubIssueUrl(input: string): GitHubIssueRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Unsupported GitHub issue URL');
  }

  if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
    throw new Error('Unsupported GitHub issue URL');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 4 || parts[2] !== 'issues') {
    throw new Error('Unsupported GitHub issue URL');
  }

  const issueNumber = Number(parts[3]);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Unsupported GitHub issue URL');
  }

  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) throw new Error('Unsupported GitHub issue URL');

  return {
    owner,
    repo,
    issueNumber,
    normalizedUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
  };
}
