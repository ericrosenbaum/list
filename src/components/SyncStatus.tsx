import { useEffect, useState } from "react";
import { subscribe } from "../lib/sync";
import type { SyncState } from "../types";
import { loadSettings } from "../lib/storage";

function label(s: SyncState, hasConfig: boolean): string {
  if (!hasConfig) return "no sync";
  switch (s.kind) {
    case "idle":
      return "synced";
    case "pulling":
      return "pulling…";
    case "pushing":
      return "saving…";
    case "offline":
      return "offline";
    case "error":
      return "sync error";
  }
}

function cls(s: SyncState, hasConfig: boolean): string {
  if (!hasConfig) return "sync-status muted";
  switch (s.kind) {
    case "idle":
      return "sync-status ok";
    case "pulling":
    case "pushing":
      return "sync-status busy";
    case "offline":
      return "sync-status muted";
    case "error":
      return "sync-status err";
  }
}

export function SyncStatus() {
  const [state, setState] = useState<SyncState>({ kind: "idle" });
  const [hasConfig, setHasConfig] = useState<boolean>(() => {
    const s = loadSettings();
    return Boolean(s.gistToken && s.gistId);
  });

  useEffect(() => {
    function recheck() {
      const s = loadSettings();
      setHasConfig(Boolean(s.gistToken && s.gistId));
    }
    const unsub = subscribe((s) => {
      setState(s);
      recheck();
    });
    window.addEventListener("focus", recheck);
    window.addEventListener("storage", recheck);
    window.addEventListener("list-settings-changed", recheck);
    return () => {
      unsub();
      window.removeEventListener("focus", recheck);
      window.removeEventListener("storage", recheck);
      window.removeEventListener("list-settings-changed", recheck);
    };
  }, []);

  const title = state.kind === "error" ? state.message : label(state, hasConfig);

  return (
    <span className={cls(state, hasConfig)} title={title}>
      {label(state, hasConfig)}
    </span>
  );
}
