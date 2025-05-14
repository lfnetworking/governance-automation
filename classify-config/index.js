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

// index.js
// ... (other requires and setup) ...

(async () => {
  try {
    // ... (get inputs, octokit, config) ...
    const [owner, repo] = repoSlug.split('/');
    const metrics = {};
    let determinedPhase = 'Unknown'; // Use a variable to hold the phase determined by this script

    // Helper function (if not already defined, or ensure it's in scope)
    const daysAgo = iso => (Date.now() - new Date(iso)) / 864e5;


    // ───────────── 1. Repository metadata  ─────────────
    const repoData = await octokit.rest.repos.get({ owner, repo }).then(r => r.data).catch(() => null);

    if (!repoData) {
      determinedPhase = 'Inaccessible';
      core.setOutput('phase', determinedPhase);
      // Ensure GITHUB_WORKSPACE is available or use a relative path './repo.json'
      // as the working directory for the script is ${{ env.CLASSIFY_ACTION_PATH }}
      // and the bash script expects 'repo.json' in the current working directory of index.js
      fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, details: "Repository data not accessible via API." }, null, 2));
      return; // Exit after writing JSON
    }

    if (repoData.archived) {
      determinedPhase = 'Archive';
      core.setOutput('phase', determinedPhase);
      fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, details: "Repository is archived." }, null, 2));
      return; // Exit after writing JSON
    }

    metrics.ageYrs = (Date.now() - new Date(repoData.created_at)) / (365 * 864e5);
    metrics.silentDays = daysAgo(repoData.pushed_at);

    // ... (rest of your metric collection: contributors, commits, release age) ...
    // Ensure all API calls have .catch() blocks or are handled to prevent unhandled rejections
    // Example for contributors:
    try {
      const contributors = await octokit.paginate(octokit.rest.repos.listContributors, { owner, repo, anon: true });
      metrics.contributors = contributors.length;
    } catch (listContributorsError) {
      console.warn(`[WARN] Could not list contributors for ${repoSlug}: ${listContributorsError.message}`);
      metrics.contributors = 0; // Default value on error
    }

    // Example for commits:
    try {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const commits = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, since });
      metrics.commits90d = commits.length;
    } catch (listCommitsError) {
      console.warn(`[WARN] Could not list commits for ${repoSlug}: ${listCommitsError.message}`);
      metrics.commits90d = 0; // Default value on error
    }

    // Example for release:
    try {
      const rel = await octokit.rest.repos.getLatestRelease({ owner, repo });
      metrics.lastRelDays = daysAgo(rel.data.published_at);
      metrics.hasRelease = true;
    } catch (getReleaseError) {
      // Check if it's a 404 (no releases), which is not necessarily a script-breaking error
      if (getReleaseError.status === 404) {
        console.log(`[INFO] No releases found for ${repoSlug}.`);
      } else {
        console.warn(`[WARN] Error fetching latest release for ${repoSlug}: ${getReleaseError.message}`);
      }
      metrics.lastRelDays = Infinity;
      metrics.hasRelease = false;
    }

    // ──────────────────────────────────────────────────
    // 🧠  Dynamic Phase Selection Based on Config Rules
    // ──────────────────────────────────────────────────
    let selectedPhase = 'Unknown'; // This was 'determinedPhase' in my thought process, let's stick to your var name
    for (const [phaseName, rules] of Object.entries(config.phases)) { // Changed 'phase' to 'phaseName' to avoid conflict if 'phase' is a metric
      let isMatch = true;
      for (const [metric, constraint] of Object.entries(rules)) {
        const val = metrics[metric];
        if (val === undefined && metric in rules) { // Metric not successfully collected but rule exists
            console.warn(`[WARN] Metric '${metric}' required by phase '${phaseName}' was not collected for ${repoSlug}.`);
            isMatch = false; // Or handle as per your desired logic
            break;
        }
        if (constraint.min !== undefined && val < constraint.min) isMatch = false;
        if (constraint.max !== undefined && val > constraint.max) isMatch = false;
        if (typeof constraint === 'boolean' && constraint !== !!val) isMatch = false; // Make sure val is defined or handle appropriately
        if (!isMatch) break; // Optimization: if one rule fails, no need to check others for this phase
      }
      if (isMatch) {
        selectedPhase = phaseName;
        break;
      }
    }
    determinedPhase = selectedPhase; // Assign the finally selected phase

    // Output result to workflow and save as artifact
    core.setOutput('phase', determinedPhase);
    // Correct path for repo.json is relative to the script's execution directory
    // The bash script expects 'repo.json' to be in the current directory after node runs.
    // The working directory for the node script is set by `working-directory: ${{ env.CLASSIFY_ACTION_PATH }}`
    // in the workflow, so `${process.env.GITHUB_WORKSPACE}/repo.json` might be incorrect if GITHUB_WORKSPACE is not the same.
    // Writing to 'repo.json' directly should place it in the CLASSIFY_ACTION_PATH.
    // The bash script then does `mv "repo.json" "$result_json_path"` from that working directory.
    fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, metrics: metrics }, null, 2)); // Added metrics for debugging

  } catch (err) {
    core.setFailed(`Error in classification script for ${core.getInput('repo') || 'unknown repo'}: ${err.message}\n${err.stack}`);
    // If core.setFailed is called, repo.json might not be written here.
    // The bash wrapper will then create the "Classification Error" JSON.
  }
})();
