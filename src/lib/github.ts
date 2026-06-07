import { Octokit } from "@octokit/rest";

// Validate env variable lazily to allow Next.js build to pass without env vars
function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token && process.env.NODE_ENV !== "development") {
    console.warn("Warning: Missing GITHUB_TOKEN environment variable");
  }
  return token || "dummy_token_for_build";
}

export const github = new Octokit({
  auth: getGitHubToken(),
});

/**
 * Parses a GitHub URL to extract the owner and repo name.
 * e.g., https://github.com/vercel/next.js -> { owner: "vercel", repo: "next.js" }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1].replace(".git", "") };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches the complete file tree for a repository branch.
 */
export async function getRepoTree(owner: string, repo: string, branch: string = "main") {
  // First get the commit SHA for the branch
  const { data: refData } = await github.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const commitSha = refData.object.sha;

  // Fetch the full tree recursively
  const { data: treeData } = await github.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  return {
    commitSha,
    tree: treeData.tree,
  };
}

/**
 * Fetches the content of a specific file by its blob SHA from GitHub.
 * Used during ingestion where we already have the blob SHA from the tree.
 */
export async function getFileContent(owner: string, repo: string, fileSha: string): Promise<string> {
  const { data } = await github.git.getBlob({
    owner,
    repo,
    file_sha: fileSha,
  });

  // Decode base64 content
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * Fetches the content of a specific file at a given commit SHA.
 * Used during change detection where we have a commit SHA and a file path.
 */
export async function getFileAtCommit(
  owner: string,
  repo: string,
  filePath: string,
  ref: string
): Promise<string> {
  const { data } = await github.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref,
  });

  // getContent returns an array for directories; for files it's a single object
  if (Array.isArray(data)) {
    throw new Error(`Path '${filePath}' resolves to a directory, not a file`);
  }

  const fileData = data as { encoding?: string; content?: string };
  if (fileData.encoding !== "base64" || !fileData.content) {
    throw new Error(`Unexpected content format for '${filePath}'`);
  }

  return Buffer.from(fileData.content, "base64").toString("utf-8");
}

/**
 * Fetches recent commits since a specific SHA.
 * Note: GitHub API limits results, so pagination might be needed for large gaps.
 */
export async function getCommitsSince(owner: string, repo: string, branch: string, sinceSha?: string) {
  const params: any = {
    owner,
    repo,
    sha: branch,
    per_page: 100,
  };

  const { data: commits } = await github.repos.listCommits(params);
  
  if (!sinceSha) {
    return commits;
  }

  // Find the index of the last known commit
  const index = commits.findIndex(c => c.sha === sinceSha);
  
  if (index === -1) {
     // If sinceSha is not in the first 100 commits, we would need to paginate or we missed history.
     // For this project, we'll just return the 100 recent ones.
     return commits;
  }

  // Return only newer commits
  return commits.slice(0, index);
}

/**
 * Fetches the diff for a specific commit.
 */
export async function getCommitDiff(owner: string, repo: string, ref: string): Promise<string> {
  const { data } = await github.repos.getCommit({
    owner,
    repo,
    ref,
    mediaType: {
      format: "diff",
    },
  });

  return data as unknown as string;
}
