import { GistError, pullGist, pushGist, type GistConfig } from "./gist";
import {
  loadLastSyncedAt,
  loadSettings,
  saveLastSyncedAt,
} from "./storage";
import type { SyncState } from "../types";

const PUSH_DEBOUNCE_MS = 1500;

type Listener = (s: SyncState) => void;

let state: SyncState = { kind: "idle" };
const listeners = new Set<Listener>();

function setState(next: SyncState) {
  state = next;
  for (const l of listeners) l(state);
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

function currentConfig(): GistConfig | null {
  const { gistToken, gistId } = loadSettings();
  if (!gistToken || !gistId) return null;
  return { token: gistToken, id: gistId };
}

function handleError(e: unknown) {
  if (e instanceof GistError && e.status === null) {
    setState({ kind: "offline" });
    return;
  }
  const message = e instanceof Error ? e.message : String(e);
  setState({ kind: "error", message });
}

export type PullOutcome =
  | { kind: "no-config" }
  | { kind: "empty"; remoteUpdatedAt: string }
  | { kind: "remote-newer"; doc: unknown; remoteUpdatedAt: string }
  | { kind: "up-to-date"; remoteUpdatedAt: string }
  | { kind: "error"; message: string };

export async function pullDoc(): Promise<PullOutcome> {
  const cfg = currentConfig();
  if (!cfg) return { kind: "no-config" };
  setState({ kind: "pulling" });
  try {
    const { doc, updatedAt } = await pullGist(cfg);
    setState({ kind: "idle" });
    if (doc === null) {
      return { kind: "empty", remoteUpdatedAt: updatedAt };
    }
    const lastSynced = loadLastSyncedAt();
    if (lastSynced && updatedAt <= lastSynced) {
      return { kind: "up-to-date", remoteUpdatedAt: updatedAt };
    }
    saveLastSyncedAt(updatedAt);
    return { kind: "remote-newer", doc, remoteUpdatedAt: updatedAt };
  } catch (e) {
    handleError(e);
    return {
      kind: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

let pushTimer: number | null = null;
let pendingDoc: unknown = null;
let inFlight: Promise<void> | null = null;

async function flushPush() {
  const cfg = currentConfig();
  if (!cfg || pendingDoc === null) return;
  const doc = pendingDoc;
  pendingDoc = null;
  setState({ kind: "pushing" });
  try {
    const { updatedAt } = await pushGist(cfg, doc);
    saveLastSyncedAt(updatedAt);
    setState({ kind: "idle" });
  } catch (e) {
    handleError(e);
  } finally {
    if (pendingDoc !== null) {
      // A new edit arrived during the in-flight push — kick another one.
      scheduleFlush(0);
    }
  }
}

function scheduleFlush(delayMs: number) {
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    if (inFlight) {
      // a push is already happening; pendingDoc will be picked up after it
      return;
    }
    inFlight = flushPush().finally(() => {
      inFlight = null;
    });
  }, delayMs);
}

export function pushDoc(doc: unknown): void {
  const cfg = currentConfig();
  if (!cfg) return;
  pendingDoc = doc;
  scheduleFlush(PUSH_DEBOUNCE_MS);
}

export async function testConnection(cfg: GistConfig): Promise<string> {
  // Direct call, doesn't mutate global state.
  await pullGist(cfg);
  return "Connection OK";
}
