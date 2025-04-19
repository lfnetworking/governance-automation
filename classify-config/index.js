// =============================================================================
//  LFN Lifecycle Classification GitHub Action
//  -----------------------------------------------------------------------------
//  This custom GitHub Action evaluates the current state of a repository using
//  GitHub REST APIs and classifies it into a TAC-defined lifecycle phase.
//
//  It reads threshold rules from a .yml config and dynamically selects the best
//  matching phase (e.g., Spark, Incubation, Active Dev, etc.).
//  -----------------------------------------------------------------------------

const core = require('@actions/core');         // GitHub Actions toolkit to read inputs/outputs
const github = require('@actions/github');     // GitHub SDK for REST API calls
const fs = require('fs');                      // Filesystem access to read config
const yaml = require('js-yaml');               // YAML parser for classify-config.yml

(async () => {
  try {
    // Retrieve GitHub token and inputs
    const token = process.env.GITHUB_TOKEN || core.getInput('token');
    const octokit = github.getOctokit(token);
    const repoSlug = core.getInput('repo');
    const configPath = core.getInput('config_path');

    // Debug log to verify input path
    console.log('[DEBUG] config_path input value:', configPath);

    // Sanity check: make sure file exists
    if (!fs.existsSync(configPath)) {
      throw new Error(`[ERROR] File not found: ${configPath}`);
    }

    // Parse lifecycle phase definitions from config file
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const [owner, repo] = repoSlug.split('/');

    // Helper function: converts ISO timestamp to age in days
    const daysAgo = iso => (Date.now() - new Date(iso)) / 864e5;

    // Initialize metrics container
    const metrics = {};

    // ───────────── 1. Repository metadata  ─────────────
    const repoData = await octokit.rest.repos.get({ owner, repo }).then(r => r.data).catch(() => null);
    if (!repoData) return core.setOutput('phase', 'Inaccessible');
    if (repoData.archived) return core.setOutput('phase', 'Archive');

    metrics.ageYrs = (Date.now() - new Date(repoData.created_at)) / (365 * 864e5);
    metrics.silentDays = daysAgo(repoData.pushed_at);

    // ───────────── 2. Contributor Count  ─────────────
    try {
      const contributors = await octokit.paginate(octokit.rest.repos.listContributors, { owner, repo, anon: true });
      metrics.contributors = contributors.length;
    } catch {
      metrics.contributors = 0;
    }

    // ───────────── 3. Commit Velocity (90 days)  ──────
    try {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const commits = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, since });
      metrics.commits90d = commits.length;
    } catch {
      metrics.commits90d = 0;
    }

    // ───────────── 4. Last Release Age  ───────────────
    try {
      const rel = await octokit.rest.repos.getLatestRelease({ owner, repo });
      metrics.lastRelDays = daysAgo(rel.data.published_at);
      metrics.hasRelease = true;
    } catch {
      metrics.lastRelDays = Infinity;
      metrics.hasRelease = false;
    }

    // ──────────────────────────────────────────────────
    // 🧠  Dynamic Phase Selection Based on Config Rules
    //     Loops through each phase and compares thresholds
    // ──────────────────────────────────────────────────
    let selectedPhase = 'Unknown';
    for (const [phase, rules] of Object.entries(config.phases)) {
      let isMatch = true;
      for (const [metric, constraint] of Object.entries(rules)) {
        const val = metrics[metric];
        if (constraint.min !== undefined && val < constraint.min) isMatch = false;
        if (constraint.max !== undefined && val > constraint.max) isMatch = false;
        if (typeof constraint === 'boolean' && constraint !== !!val) isMatch = false;
      }
      if (isMatch) {
        selectedPhase = phase;
        break;
      }
    }

    // Output result to workflow and save as artifact
    core.setOutput('phase', selectedPhase);
    fs.writeFileSync(`${process.env.GITHUB_WORKSPACE}/repo.json`, JSON.stringify({ repo: repoSlug, phase: selectedPhase }, null, 2));
  } catch (err) {
    core.setFailed(err.message);
  }
})();
