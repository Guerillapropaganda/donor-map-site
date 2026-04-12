/**
 * Cloudflare Worker: Web3Forms → GitHub repository_dispatch relay
 *
 * Receives the Web3Forms webhook POST, reshapes it into a GitHub
 * repository_dispatch event, and forwards it with auth.
 *
 * SETUP:
 * 1. Create a Cloudflare account (free) → Workers & Pages → Create Worker
 * 2. Paste this code into the worker editor
 * 3. Add environment variable: GITHUB_PAT = your fine-grained PAT
 * 4. Deploy — you'll get a URL like: https://tip-relay.<your-subdomain>.workers.dev
 * 5. In Web3Forms Pro dashboard: set webhook URL to that Cloudflare Worker URL
 *
 * FLOW:
 * Web3Forms → Cloudflare Worker → GitHub repository_dispatch → GitHub Action → vault file
 */

export default {
  async fetch(request, env) {
    // Only accept POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse the Web3Forms payload
    let formData;
    try {
      formData = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Extract fields (Web3Forms sends raw form field names)
    const payload = {
      event_type: "new-tip",
      client_payload: {
        profile: formData.profile || "Unknown",
        profile_url: formData.profile_url || "",
        email: formData.email || "",
        category: formData.category || "other",
        message: formData.message || "",
      },
    };

    // Forward to GitHub
    const GITHUB_PAT = env.GITHUB_PAT;
    if (!GITHUB_PAT) {
      return new Response("GITHUB_PAT not configured", { status: 500 });
    }

    const githubRes = await fetch(
      "https://api.github.com/repos/Guerillapropaganda/donor-map-site/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `token ${GITHUB_PAT}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DonorMap-TipRelay",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (githubRes.status === 204) {
      return new Response("OK", { status: 200 });
    } else {
      const body = await githubRes.text();
      return new Response(`GitHub error: ${githubRes.status} ${body}`, {
        status: 502,
      });
    }
  },
};
