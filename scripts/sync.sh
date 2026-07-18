#!/usr/bin/env bash
# Idempotent sync for the plain-text to-do list.
# Commits any local changes, integrates remote changes, and pushes.
# Safe to run repeatedly and from overlapping triggers (launchd watcher +
# Claude Code SessionStart/Stop hooks) — a lock serializes runs.
set -uo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 0

LOCK="$REPO/.sync.lock"
LOG="$HOME/Library/Logs/list-sync.log"
STALE_SECONDS=120

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"$LOG" 2>/dev/null; }

# --- lock: atomic mkdir; clear a stale lock left by a crashed run ---
if ! mkdir "$LOCK" 2>/dev/null; then
  age=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
  if [ "$age" -gt "$STALE_SECONDS" ]; then
    log "clearing stale lock (${age}s old)"
    rm -rf "$LOCK"
    mkdir "$LOCK" 2>/dev/null || exit 0
  else
    exit 0  # another run is active; let it do the work
  fi
fi
trap 'rm -rf "$LOCK"' EXIT

# --- sanity: real git repo with an origin remote ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { log "not a git repo"; exit 0; }
git remote get-url origin >/dev/null 2>&1 || { log "no origin remote"; exit 0; }
branch="$(git rev-parse --abbrev-ref HEAD)"

# --- commit local edits, if any ---
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  if git commit -q -m "sync $(date '+%Y-%m-%d %H:%M')"; then
    log "committed local changes"
  fi
fi

# --- integrate remote changes (rebase local commits on top) ---
if ! git pull --rebase --autostash -q origin "$branch" 2>>"$LOG"; then
  log "pull --rebase failed (conflict?) — aborting; leaving local commits for manual resolution"
  git rebase --abort 2>/dev/null
  exit 1
fi

# --- push only if we have commits the remote lacks ---
if [ -n "$(git rev-list "origin/$branch..HEAD" 2>/dev/null)" ]; then
  if git push -q -u origin "$branch" 2>>"$LOG"; then
    log "pushed"
  else
    log "push failed (offline or auth?)"
    exit 1
  fi
fi

exit 0
