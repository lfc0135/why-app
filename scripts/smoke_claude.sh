#!/usr/bin/env bash
# Generate chalkboard scripts and MP4s with the Claude key in the environment.
# Repeats of a cached term do not call Claude. Stops before a call that would
# push this run past CLAUDE_RUN_CAP_USD (default $2). The lifetime ledger
# refuses calls that would pass CLAUDE_BUDGET_USD (default $20, hard ceiling $20).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "Set ANTHROPIC_API_KEY in the environment. This script does not read a key from the repo." >&2
  exit 1
fi

export LLM_PROVIDER="${LLM_PROVIDER:-anthropic}"
export LLM_MODEL="${LLM_MODEL:-claude-haiku-5-5}"
export CLAUDE_BUDGET_USD="${CLAUDE_BUDGET_USD:-20}"
export CLAUDE_RUN_CAP_USD="${CLAUDE_RUN_CAP_USD:-2}"

if [[ $# -lt 1 ]]; then
  echo 'Usage: scripts/smoke_claude.sh "photosynthesis" "private credit"' >&2
  exit 1
fi

exec ./node_modules/.bin/tsx scripts/smoke-claude.ts "$@"
