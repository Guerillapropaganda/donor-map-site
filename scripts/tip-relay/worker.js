/**
 * Cloudflare Worker: Web3Forms → GitHub workflow_dispatch relay
 *
 * Receives the Web3Forms webhook POST, triggers the save-tip GitHub Action
 * via the workflow_dispatch API.
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let formData;
    try {
      formData = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const GITHUB_PAT = env.GITHUB_PAT;
    if (!GITHUB_PAT) {
      return new Response("GITHUB_PAT not configured", { status: 500 });
    }

    // Use workflow_dispatch API
    const payload = {
      ref: "v4",
      inputs: {
        profile: formData.profile || "Unknown",
        profile_url: formData.profile_url || "",
        email: formData.email || "",
        category: formData.category || "other",
        message: formData.message || "",
      },
    };

    const githubRes = await fetch(
      "https://api.github.com/repos/Guerillapropaganda/donor-map-site/actions/workflows/save-tip.yml/dispatches",
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
