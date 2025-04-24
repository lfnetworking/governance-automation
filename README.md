# LFN Project Governance Automation ⚙️

[![Weekly Workflow Status](https://github.com/lfnetworking/governance-automation/actions/workflows/lfn-project-governance.yml/badge.svg)](https://github.com/lfnetworking/governance-automation/actions/workflows/lfn-project-governance.yml)
[![Open Issues](https://img.shields.io/github/issues/lfnetworking/governance-automation?label=open%20issues)](https://github.com/lfnetworking/governance-automation/issues)
[![License](https://img.shields.io/github/license/lfnetworking/governance-automation)](./LICENSE) This repository contains tooling to automate project lifecycle monitoring and reporting across participating Linux Foundation Networking (LFN) projects. Its goal is to provide consistent, data-driven insights into project health and activity, supporting the LFN Technical Advisory Council (TAC), project maintainers, and the governing board.

## What it Does

A GitHub Actions workflow runs automatically **every Monday at 09:00 UTC** (and can be triggered manually). For each LFN organization listed in the configuration, the workflow performs the following steps:

1.  **Lists Repositories:** Identifies all public repositories within the target organization.
2.  **Gathers Metrics:** For each repository, it collects publicly available data points using the GitHub API, such as:
    * Commit history (e.g., date of last push, commit frequency)
    * Contributor count
    * Release history
    * Repository age
    * Archived status
3.  **Classifies Lifecycle Phase:** Based on configurable rules defined by the LFN TAC ([`classify-config.yml`](./.github/workflows/classify-config.yml)), it assigns each repository to one of the defined lifecycle phases (e.g., Spark, Incubation, Active, Stable, Maintenance/LTS, Archive).
4.  **Generates Report:** Compiles the results for all processed repositories into a Markdown summary.
5.  **Publishes Summary:** Creates or updates a GitHub Issue within *this* repository ([`lfnetworking/governance-automation`](https://github.com/lfnetworking/governance-automation)) containing the full Markdown summary report. The workflow run summary page also includes this report.
6.  **(Optional) Notifies Slack:** Sends a notification to a configured Slack channel upon completion.
7.  **(Future) Creates Guidance Issues:** Optionally (currently disabled), the workflow can create or update issues directly within *each classified repository* offering phase-specific guidance based on customizable templates.

## Key Components

* **Workflow Definition:** [`.github/workflows/lfn-project-governance.yml`](./.github/workflows/lfn-project-governance.yml) - Defines the jobs, steps, triggers, and permissions for the GitHub Actions workflow.
* **Project List:** [`./.lfn/projects.yaml`](./.lfn/projects.yaml) - A simple list of LFN GitHub organization names whose repositories should be included in the analysis.
* **Classification Logic:** [`./classify-config/`](./classify-config/) - Contains the custom JavaScript GitHub Action (`index.js`) that fetches repository metrics via the GitHub API and applies the classification rules.
* **Classification Rules:** [`./.lfn/classify-config.yml`](./.lfn/classify-config.yml) - Defines the specific metrics and thresholds used to determine the lifecycle phase for each repository. This file is intended to be updated based on LFN TAC decisions.
* **Guidance Issue Templates:** [`./.lfn/issues-config.yml`](./.lfn/issues-config.yml) - **(Future Use)** Defines customizable templates (title, body, labels, assignees) for the *optional* phase-specific guidance issues that can be automatically created in each project's repository. This allows tailoring the automated feedback provided to projects based on their classified phase.

## Configuration & Requirements

* **Organizations:** To add or remove an LFN project (organization) from the scan, update the list in [`./.lfn/projects.yaml`](./.lfn/projects.yaml).
* **Lifecycle Rules:** To adjust the metrics or thresholds for lifecycle phases, modify [`./.lfn/classify-config.yml`](./.lfn/classify-config.yml). Changes should reflect decisions made by the LFN TAC.
* **Guidance Issues:** To customize the content of the optional, phase-specific issues created in project repositories (when this feature is enabled), modify [`./.lfn/issues-config.yml`](./.lfn/issues-config.yml).
* **Authentication:** The workflow requires a GitHub Personal Access Token (PAT) stored as a repository secret named `LFN_ADMIN_TOKEN`. This token needs sufficient **scopes** to:
    * List public repositories across the configured organizations (`public_repo` or `repo` scope).
    * Read repository metadata (`public_repo` or `repo` scope).
    * Upload workflow artifacts (`actions:write` scope).
    * Create/update issues in *this* repository (`issues:write` scope).
    * *(Future)* Create/update issues in the target project repositories (requires broader `issues:write` permissions, likely via the `repo` scope on the PAT, if the optional guidance issue feature is enabled).

## Contributing

Contributions and feedback from the LFN community are welcome!

* **Bug Reports & Feature Requests:** Please open an [Issue](https://github.com/lfnetworking/governance-automation/issues).
* **Code Contributions:** Feel free to fork the repository and submit Pull Requests. Please ensure your changes align with the project's goals and maintain code clarity.
* **Rule Adjustments:** Changes to the classification rules in [`classify-config.yml`](./.lfn/classify-config.yml) should generally follow discussions and decisions within the LFN TAC.

---

## 📌 Project Roadmap / Checklist

*(Consider updating this section based on current status)*

| Task                                   | Status                                                                                                                              |
| :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Initialize project skeleton            | ✔️ Done                                                                                                                            |
| ✍️ Write comprehensive docs            | [![I#3](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/3?label=%233)](https://github.com/lfnetworking/governance-automation/issues/3) |
| ✅ Confirm new lifecycle phases        | [![I#4](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/4?label=%234)](https://github.com/lfnetworking/governance-automation/issues/4) |
| 🎯 Refine automatable metrics per phase | [![I#5](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/5?label=%235)](https://github.com/lfnetworking/governance-automation/issues/5) |
| 🚀 Implement & test **induction** mode | Open                                                                                                                                |
| 💡 Enable & test per-repo guidance issues | Open                                                                                                                                |
| 🛡️ Integrate OSSF Scorecard checks     | Open                                                                                                                                |

---

*(The "How to Run Locally" section was removed as it requires specific token setup and might be complex for general users. Running via the GitHub Actions UI 'workflow_dispatch' trigger is the primary method.)*
