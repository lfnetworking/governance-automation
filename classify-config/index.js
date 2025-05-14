// classify-config/index.js

const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const yaml = require('js-yaml');

(async () => {
  // Get repoSlug early for the catch block, ensure it's always available for error reporting.
  let repoSlugForCatch = 'unknown repo';
  try {
    repoSlugForCatch = core.getInput('repo') || 'input_repo_not_found';

    const token = process.env.GITHUB_TOKEN || core.getInput('token');
    const octokit = github.getOctokit(token);

    // Ensure repoSlug is defined and valid before proceeding
    const repoSlug = core.getInput('repo'); // This is the main variable for the repo slug
    if (!repoSlug || typeof repoSlug !== 'string' || !repoSlug.includes('/')) {
      throw new Error(`Invalid or missing 'repo' input: '${repoSlug}'`);
    }
    console.log(`[INFO] Starting classification for repo: ${repoSlug}`);

    const configPath = core.getInput('config_path');
    if (!configPath) {
        throw new Error("Invalid or missing 'config_path' input.");
    }
    console.log('[DEBUG] config_path input value:', configPath);

    if (!fs.existsSync(configPath)) {
      throw new Error(`[ERROR] Configuration file not found: ${configPath}`);
    }

    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const [owner, repo] = repoSlug.split('/'); // Use the validated repoSlug

    let determinedPhase = 'Unknown'; // Default phase

    const daysAgo = iso => (Date.now() - new Date(iso)) / 864e5;
    const metrics = {};

    console.log(`[DEBUG] Fetching repository metadata for ${owner}/${repo}`);
    const repoData = await octokit.rest.repos.get({ owner, repo })
        .then(r => r.data)
        .catch(err => {
            console.warn(`[WARN] Failed to fetch repo data for ${repoSlug}: ${err.message}`);
            if (err.status === 404 || err.status === 403 || err.status === 401) {
                determinedPhase = 'Inaccessible';
            } else {
                throw err; // Re-throw other errors to be caught by the main catch block
            }
            return null; // Explicitly return null if repoData can't be fetched
        });

    if (determinedPhase === 'Inaccessible') {
      core.setOutput('phase', determinedPhase);
      fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, details: "Repository data not accessible or not found via API." }, null, 2));
      console.log(`[INFO] Phase for ${repoSlug}: ${determinedPhase}. repo.json written.`);
      return;
    }

    if (repoData && repoData.archived) {
      determinedPhase = 'Archive';
      core.setOutput('phase', determinedPhase);
      fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, details: "Repository is archived." }, null, 2));
      console.log(`[INFO] Phase for ${repoSlug}: ${determinedPhase}. repo.json written.`);
      return;
    }
    
    // Ensure repoData is available before accessing its properties
    if (!repoData) {
        // This case should ideally be covered by the 'Inaccessible' block above,
        // but as a safeguard:
        throw new Error(`[ERROR] repoData is null for ${repoSlug} after initial checks. This should not happen.`);
    }

    metrics.ageYrs = (Date.now() - new Date(repoData.created_at)) / (365 * 864e5);
    metrics.silentDays = daysAgo(repoData.pushed_at);

    console.log(`[DEBUG] Fetching contributors for ${repoSlug}`);
    try {
      const contributors = await octokit.paginate(octokit.rest.repos.listContributors, { owner, repo, anon: true });
      metrics.contributors = contributors.length;
    } catch (err) {
      console.warn(`[WARN] Could not list contributors for ${repoSlug}: ${err.message}`);
      metrics.contributors = 0;
    }

    console.log(`[DEBUG] Fetching commits (last 90d) for ${repoSlug}`);
    try {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const commits = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, since });
      metrics.commits90d = commits.length;
    } catch (err) {
      console.warn(`[WARN] Could not list commits for ${repoSlug}: ${err.message}`);
      metrics.commits90d = 0;
    }

    console.log(`[DEBUG] Fetching latest release for ${repoSlug}`);
    try {
      const rel = await octokit.rest.repos.getLatestRelease({ owner, repo });
      metrics.lastRelDays = daysAgo(rel.data.published_at);
      metrics.hasRelease = true;
    } catch (err) {
      if (err.status === 404) {
        console.log(`[INFO] No releases found for ${repoSlug}.`);
      } else {
        console.warn(`[WARN] Error fetching latest release for ${repoSlug}: ${err.message}`);
      }
      metrics.lastRelDays = Infinity;
      metrics.hasRelease = false;
    }

    console.log(`[DEBUG] Metrics for ${repoSlug}:`, JSON.stringify(metrics, null, 2));

    // Dynamic Phase Selection
    for (const [phaseName, rules] of Object.entries(config.phases)) {
      let isMatch = true;
      for (const [metricKey, constraint] of Object.entries(rules)) {
        const val = metrics[metricKey];
        if (val === undefined && metricKey in rules) {
            console.warn(`[WARN] Metric '${metricKey}' for phase '${phaseName}' rule not found in collected metrics for ${repoSlug}.`);
            isMatch = false;
            break;
        }
        if (constraint.min !== undefined && val < constraint.min) isMatch = false;
        if (constraint.max !== undefined && val > constraint.max) isMatch = false;
        if (typeof constraint === 'boolean' && constraint !== !!val) isMatch = false;
        if (!isMatch) break;
      }
      if (isMatch) {
        determinedPhase = phaseName;
        break;
      }
    }
    console.log(`[INFO] Dynamically selected phase for ${repoSlug}: ${determinedPhase}`);

    core.setOutput('phase', determinedPhase);
    fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: determinedPhase, metrics }, null, 2));
    console.log(`[INFO] repo.json written successfully for ${repoSlug}. Phase: ${determinedPhase}`);

  } catch (err) {
    // Use the repoSlugForCatch which is fetched at the very beginning of the try block
    core.setFailed(`Error in classification script for ${repoSlugForCatch}: ${err.message}\n${err.stack}`);
    // When core.setFailed() is called, the script will exit with a non-zero code.
    // The bash wrapper script will then create the "Classification Error" JSON.
  }
})();
