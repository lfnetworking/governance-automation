# ----------------------------------------------------------------------------
#  .github/scripts/lifecycle.ts  (pseudo‑code snippet)
# ----------------------------------------------------------------------------
#  export function classify(repo: RepoMetadata): LifecyclePhase {
#    /*
#     * Heuristic thresholds (tune as needed):
#     * – Spark: < 3 contributors, no release tags
#     * – Incubation: ≥ 3 contributors, < 1 tagged release, project age < 6 months
#     * – Active Development: ≥ 10 commits in past 90 days & ≥ 1 release
#     * – Stable: commits in past 6 months < 10 but ≥ 1 release in past year
#     * – Maintenance: no feature commits in 6 months but security patches < 90 days
#     * – Deprecation: EOL notice in repo or "deprecated" in README
#     * – Archive: repo archived flag == true
#     */   }
