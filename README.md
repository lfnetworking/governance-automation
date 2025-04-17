# 🔧 LFN Governance Automation&nbsp;<sup>(draft)</sup>

[![Weekly workflow](https://github.com/lfnetworking/governance-automation/actions/workflows/lfn-project-governance.yml/badge.svg)](./.github/workflows/lfn-project-governance.yml)
[![Open governance issues](https://img.shields.io/github/issues/lfnetworking/governance-automation?label=open%20issues)](https://github.com/lfnetworking/governance-automation/issues)

Automates **project‑lifecycle monitoring** for every Linux Foundation Networking (LFN) repository.  
A GitHub Action runs **every Monday @ 09:00 UTC** and:

1. Discovers all repos listed in [`./.lfn/projects.yaml`](./.lfn/projects.yaml) &nbsp;▶
2. Gathers public metrics (commits, contributors, releases, etc.) &nbsp;▶
3. Classifies each repo into one of **seven TAC lifecycle phases** (Spark → LTS) &nbsp;▶
4. Publishes a Markdown summary + optional Slack ping.

The workflow is defined in [`.github/workflows/lfn-project-governance.yml`](./.github/workflows/lfn-project-governance.yml)  
and is deliberately **REST‑only** so it can run using the default `GITHUB_TOKEN`.

---

## 📌 Project Roadmap / Checklist

| Task | Status |
|------|--------|
| Initialize project skeleton | ✔️ _done_ |
| ✍️ Write comprehensive docs | [![I#3](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/3?label=%233)](https://github.com/lfnetworking/governance-automation/issues/3) |
| ✅ Confirm new lifecycle phases | [![I#4](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/4?label=%234)](https://github.com/lfnetworking/governance-automation/issues/4) |
| 🎯 Refine automatable metrics per phase | [![I#5](https://img.shields.io/github/issues/detail/state/lfnetworking/governance-automation/5?label=%235)](https://github.com/lfnetworking/governance-automation/issues/5) |
| 🚀 Implement & test **induction** mode | _open_ |

---

## 🗂 How to Run Locally

```bash
# Requires: gh CLI, jq, yq
gh auth login            # ensure you have a token
make dry‑run             # enumerates repos and prints the summary without pushing anything
