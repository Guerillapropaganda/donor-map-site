import { Octokit } from "octokit"

const OWNER = "Guerillapropaganda"
const REPO = "donor-map-site"
const BRANCH = "v4"

let _octokit: Octokit | null = null

function getOctokit(): Octokit {
  if (!_octokit) {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error("GITHUB_TOKEN not set in .env.local")
    _octokit = new Octokit({ auth: token })
  }
  return _octokit
}

export interface VaultFile {
  path: string
  sha: string
  size: number
}

// Fetch the full file tree from the v4 branch
export async function getVaultTree(): Promise<VaultFile[]> {
  const octokit = getOctokit()
  const { data } = await octokit.rest.git.getTree({
    owner: OWNER,
    repo: REPO,
    tree_sha: BRANCH,
    recursive: "true",
  })

  return data.tree
    .filter((item) => item.type === "blob" && item.path?.startsWith("content/") && item.path.endsWith(".md"))
    .map((item) => ({
      path: item.path!,
      sha: item.sha!,
      size: item.size || 0,
    }))
}

// Fetch a single file's content
export async function getFileContent(path: string): Promise<string> {
  const octokit = getOctokit()
  const { data } = await octokit.rest.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path,
    ref: BRANCH,
  })

  if ("content" in data && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8")
  }
  throw new Error(`Could not read file: ${path}`)
}

// Fetch multiple files in parallel (batched)
export async function getFilesContent(paths: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const BATCH_SIZE = 20

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE)
    const contents = await Promise.allSettled(batch.map((p) => getFileContent(p)))

    contents.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.set(batch[idx], result.value)
      }
    })
  }

  return results
}

// Trigger a GitHub Actions workflow
export async function triggerWorkflow(workflowId: string, inputs?: Record<string, string>): Promise<void> {
  const octokit = getOctokit()
  await octokit.rest.actions.createWorkflowDispatch({
    owner: OWNER,
    repo: REPO,
    workflow_id: workflowId,
    ref: BRANCH,
    inputs,
  })
}

// Get recent workflow runs
export async function getWorkflowRuns(workflowId: string, count = 5) {
  const octokit = getOctokit()
  const { data } = await octokit.rest.actions.listWorkflowRuns({
    owner: OWNER,
    repo: REPO,
    workflow_id: workflowId,
    per_page: count,
  })
  return data.workflow_runs
}

// Get recent commits
export async function getRecentCommits(count = 20) {
  const octokit = getOctokit()
  const { data } = await octokit.rest.repos.listCommits({
    owner: OWNER,
    repo: REPO,
    sha: BRANCH,
    per_page: count,
  })
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    date: c.commit.author?.date || "",
    author: c.commit.author?.name || "",
  }))
}
