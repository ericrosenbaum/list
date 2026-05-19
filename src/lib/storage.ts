import type { ChatSession, AppSettings } from "../types";

const KEYS = {
  doc: "list.doc",
  chats: "list.chats",
  activeChat: "list.activeChatId",
  apiKey: "list.apiKey",
  model: "list.model",
  gistToken: "list.gistToken",
  gistId: "list.gistId",
  lastSyncedAt: "list.lastSyncedAt",
} as const;

function read<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDoc(): unknown | null {
  return read(KEYS.doc);
}

export function saveDoc(json: unknown): void {
  write(KEYS.doc, json);
}

export function loadChats(): ChatSession[] {
  return read<ChatSession[]>(KEYS.chats) ?? [];
}

export function saveChats(chats: ChatSession[]): void {
  write(KEYS.chats, chats);
}

export function loadActiveChatId(): string | null {
  const raw = localStorage.getItem(KEYS.activeChat);
  return raw && raw.length > 0 ? raw : null;
}

export function saveActiveChatId(id: string): void {
  localStorage.setItem(KEYS.activeChat, id);
}

export function loadSettings(): AppSettings {
  return {
    apiKey: localStorage.getItem(KEYS.apiKey) ?? "",
    model: localStorage.getItem(KEYS.model) ?? "claude-sonnet-4-6",
    gistToken: localStorage.getItem(KEYS.gistToken) ?? "",
    gistId: localStorage.getItem(KEYS.gistId) ?? "",
  };
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEYS.apiKey, s.apiKey);
  localStorage.setItem(KEYS.model, s.model);
  localStorage.setItem(KEYS.gistToken, s.gistToken);
  localStorage.setItem(KEYS.gistId, s.gistId);
}

export function loadLastSyncedAt(): string | null {
  return localStorage.getItem(KEYS.lastSyncedAt);
}

export function saveLastSyncedAt(iso: string): void {
  localStorage.setItem(KEYS.lastSyncedAt, iso);
}
