import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type Anthropic from "@anthropic-ai/sdk";
import {
  loadActiveChatId,
  loadChats,
  loadSettings,
  saveActiveChatId,
  saveChats,
  saveSettings,
} from "../../lib/storage";
import type {
  AnthropicMessageParam,
  AppSettings,
  ChatSession,
  ContentBlockParam,
  ToolUseBlock,
} from "../../types";
import { serializeDoc } from "../../lib/serialize";
import { currentTimeString } from "../../lib/time";
import { applyTool } from "../../lib/tools";
import { sendTurn } from "../../lib/claude";
import { MessageView } from "./Message";
import { Composer } from "./Composer";
import { ProposedChangeCard } from "./ProposedChangeCard";
import { SettingsPanel } from "./SettingsPanel";
import { ChatHistoryMenu } from "./ChatHistoryMenu";
import { SyncStatus } from "../SyncStatus";

type Props = { editor: Editor | null };

function newSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: "New chat",
    messages: [],
  };
}

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

export function ChatPanel({ editor }: Props) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const stored = loadChats();
    return stored.length > 0 ? stored : [newSession()];
  });
  const [activeId, setActiveId] = useState<string>(
    () => loadActiveChatId() ?? "",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize activeId if not yet set.
  useEffect(() => {
    if (!activeId && chats.length > 0) {
      setActiveId(chats[0].id);
    }
  }, [activeId, chats]);

  // Persist chats and active id.
  useEffect(() => {
    saveChats(chats);
  }, [chats]);
  useEffect(() => {
    if (activeId) saveActiveChatId(activeId);
  }, [activeId]);

  const active = useMemo(
    () => chats.find((c) => c.id === activeId) ?? chats[0],
    [chats, activeId],
  );

  // Pending tool uses from the last assistant turn (awaiting approval).
  const pending: ToolUseBlock[] = useMemo(() => {
    if (!active) return [];
    const last = active.messages[active.messages.length - 1];
    if (!last || last.role !== "assistant") return [];
    if (typeof last.content === "string") return [];
    return last.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
  }, [active]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, pending.length]);

  function updateActive(fn: (s: ChatSession) => ChatSession) {
    setChats((prev) => prev.map((c) => (c.id === activeId ? fn(c) : c)));
  }

  function appendMessages(...msgs: AnthropicMessageParam[]) {
    updateActive((c) => ({ ...c, messages: [...c.messages, ...msgs] }));
  }

  function startNewChat() {
    const s = newSession();
    setChats((prev) => [...prev, s]);
    setActiveId(s.id);
  }

  async function runTurn(extraMessages: AnthropicMessageParam[]) {
    if (!editor) return;
    if (!settings.apiKey) {
      setError("Set your Anthropic API key in Settings.");
      setShowSettings(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Use the current active session's messages PLUS the just-appended messages.
      // Because state updates are async, build the list explicitly.
      const baseMessages = (chats.find((c) => c.id === activeId)?.messages ?? []).concat(
        extraMessages,
      );
      const listMarkdown = serializeDoc(editor.getJSON());
      const time = currentTimeString();
      const response = await sendTurn({
        apiKey: settings.apiKey,
        model: settings.model,
        listMarkdown,
        currentTime: time,
        messages: baseMessages,
      });
      const assistantMsg: AnthropicMessageParam = {
        role: "assistant",
        content: response.content as ContentBlockParam[],
      };
      appendMessages(assistantMsg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function onUserSend(text: string) {
    if (!active) return;
    const userMsg: AnthropicMessageParam = {
      role: "user",
      content: [{ type: "text", text }],
    };
    // Append immediately, also set title if empty/default.
    updateActive((c) => ({
      ...c,
      title: c.messages.length === 0 ? deriveTitle(text) : c.title,
      messages: [...c.messages, userMsg],
    }));
    void runTurn([userMsg]);
  }

  function onApprove() {
    if (!editor || pending.length === 0) return;
    const results: Anthropic.ToolResultBlockParam[] = pending.map((t) => {
      const r = applyTool(editor, t.name, (t.input ?? {}) as Record<string, unknown>);
      return {
        type: "tool_result",
        tool_use_id: t.id,
        content: r.message,
        is_error: !r.ok,
      };
    });
    const userMsg: AnthropicMessageParam = { role: "user", content: results };
    updateActive((c) => ({ ...c, messages: [...c.messages, userMsg] }));
    void runTurn([userMsg]);
  }

  function onReject() {
    if (pending.length === 0) return;
    const reason = window.prompt("Why are you rejecting? (optional)") ?? "";
    const results: Anthropic.ToolResultBlockParam[] = pending.map((t) => ({
      type: "tool_result",
      tool_use_id: t.id,
      content: reason
        ? `User rejected this change. Reason: ${reason}`
        : "User rejected this change.",
      is_error: true,
    }));
    const userMsg: AnthropicMessageParam = { role: "user", content: results };
    updateActive((c) => ({ ...c, messages: [...c.messages, userMsg] }));
    void runTurn([userMsg]);
  }

  if (!active) return <div className="chat-panel">Loading…</div>;

  // Render messages, skipping tool_result-only user messages from the main flow
  // (they're shown compactly via the Message component anyway).
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title" title={active.title}>
          {active.title}
        </div>
        <div className="chat-header-actions">
          <SyncStatus />
          <button className="icon-btn" title="New chat" onClick={startNewChat}>
            ＋
          </button>
          <button
            className="icon-btn"
            title="Chat history"
            onClick={() => setShowHistory(true)}
          >
            ☰
          </button>
          <button
            className="icon-btn"
            title="Settings"
            onClick={() => setShowSettings(true)}
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {active.messages.map((m, i) => (
          <MessageView key={i} message={m} editor={editor} />
        ))}
        {pending.length > 0 && !busy && (
          <ProposedChangeCard
            toolUses={pending}
            editor={editor}
            onApproveAll={onApprove}
            onRejectAll={onReject}
            disabled={busy}
          />
        )}
        {busy && <div className="thinking">Claude is thinking…</div>}
        {error && <div className="error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <Composer
        onSend={onUserSend}
        disabled={busy || pending.length > 0}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => {
            setSettings(s);
            saveSettings(s);
            window.dispatchEvent(new Event("list-settings-changed"));
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showHistory && (
        <ChatHistoryMenu
          chats={chats}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
