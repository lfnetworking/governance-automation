const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const yaml = require('js-yaml');

(async () => {
  try {
    const token = process.env.GITHUB_TOKEN || core.getInput('token');
    const octokit = github.getOctokit(token);
    const repoSlug = core.getInput('repo');
    const configPath = core.getInput('config_path');

    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    const [owner, repo] = repoSlug.split('/');
    const daysAgo = iso => (Date.now() - new Date(iso)) / 864e5;

    const metrics = {};
    const repoData = await octokit.rest.repos.get({ owner, repo }).then(r => r.data).catch(() => null);
    if (!repoData) return core.setOutput('phase', 'Inaccessible');
    if (repoData.archived) return core.setOutput('phase', 'Archive');

    metrics.ageYrs = (Date.now() - new Date(repoData.created_at)) / (365 * 864e5);
    metrics.silentDays = daysAgo(repoData.pushed_at);

    try {
      const contributors = await octokit.paginate(octokit.rest.repos.listContributors, { owner, repo, anon: true });
      metrics.contributors = contributors.length;
    } catch { metrics.contributors = 0; }

    try {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const commits = await octokit.paginate(octokit.rest.repos.listCommits, { owner, repo, since });
      metrics.commits90d = commits.length;
    } catch { metrics.commits90d = 0; }

    try {
      const rel = await octokit.rest.repos.getLatestRelease({ owner, repo });
      metrics.lastRelDays = daysAgo(rel.data.published_at);
      metrics.hasRelease = true;
    } catch {
      metrics.lastRelDays = Infinity;
      metrics.hasRelease = false;
    }

    // Dynamic phase selection
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

    core.setOutput('phase', selectedPhase);
    fs.writeFileSync('repo.json', JSON.stringify({ repo: repoSlug, phase: selectedPhase }, null, 2));
  } catch (err) {
    core.setFailed(err.message);
  }
})();
