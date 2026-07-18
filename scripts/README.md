# Sync scripts

`sync.sh` commits local changes, pulls (rebase), and pushes. It's idempotent and
locked, so it's safe to run from several triggers at once.

Two things trigger it:

1. **A launchd watcher** — `org.ericrosenbaum.list-sync.plist` — fires whenever a
   list file changes (and every 5 min as a fallback). This catches edits made in
   any editor, even when Claude isn't running.
2. **Claude Code hooks** — `.claude/settings.json` runs it at `SessionStart`
   (pull) and `Stop` (push).

## Install / manage the watcher

```sh
# install (copy the plist into place, then load it)
cp scripts/org.ericrosenbaum.list-sync.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/org.ericrosenbaum.list-sync.plist

# check it's loaded
launchctl print gui/$(id -u)/org.ericrosenbaum.list-sync | head -20

# run it right now
launchctl kickstart gui/$(id -u)/org.ericrosenbaum.list-sync

# reload after editing the plist
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/org.ericrosenbaum.list-sync.plist
cp scripts/org.ericrosenbaum.list-sync.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/org.ericrosenbaum.list-sync.plist

# stop it entirely
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/org.ericrosenbaum.list-sync.plist
```

If you add a new list file, add its path to the plist's `WatchPaths` and reload
(the 5-minute fallback picks it up until you do).

## Logs

`~/Library/Logs/list-sync.log`

## Notes

- Pushing uses your existing git credentials (HTTPS via the macOS keychain helper,
  or SSH). If pushes from the watcher fail with an auth error, that's the thing to
  fix — check the log.
- On a rebase conflict the script backs off and logs it rather than forcing
  anything; resolve it by hand and the next run continues.
