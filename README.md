# list

My to-do list, in plain text. This repo is the source of truth.

I edit the `.md` files directly (in any editor) **or** by talking to Claude Code
in this folder. Changes sync to GitHub automatically — a background watcher
commits and pushes whenever a file changes, and Claude Code pulls at the start of
each session and pushes at the end. I never have to think about git.

## The files
- **work.md** — work tasks
- **home.md** — home / personal / money
- **someday.md** — not-now stuff; pull items into work/home when ready
- **archive/done.md** — finished tasks, dated (the wins pile)
- **archive/old-list.md** — the full history from the previous app

## Conventions
- `- [ ]` open, `- [x]` done. Indent two spaces to nest sub-tasks.
- When something's done, move it to `archive/done.md` with the date instead of
  just checking it off — keeps the live lists short and the wins visible.

## How Claude helps
See `CLAUDE.md` — it tells Claude how to help me focus, prioritize, and get
started (I have ADHD and that's the whole point of this setup).

## Sync setup
The watcher is a launchd agent (`~/Library/LaunchAgents/org.ericrosenbaum.list-sync.plist`)
running `scripts/sync.sh`. See `scripts/README.md` for how to load, unload, or
check it.
