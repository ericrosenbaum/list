import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ListEditor } from "./components/Editor/ListEditor";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { pullDoc, pushDoc } from "./lib/sync";
import { saveDoc } from "./lib/storage";
import { SyncStatus } from "./components/SyncStatus";

type MobileTab = "list" | "chat";

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const onEditorReady = useCallback((e: Editor) => setEditor(e), []);

  // Pull from gist on initial mount and whenever the tab becomes visible.
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;

    async function syncFromRemote() {
      const result = await pullDoc();
      if (cancelled) return;
      if (result.kind === "remote-newer" && result.doc) {
        // Replace local editor content without re-emitting onUpdate (no push loop).
        editor!.commands.setContent(result.doc as never, false);
        saveDoc(result.doc);
      } else if (result.kind === "empty") {
        // Remote gist exists but has no list.json yet — push current local doc up.
        const current = editor!.getJSON();
        saveDoc(current);
        pushDoc(current);
      }
    }

    void syncFromRemote();

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void syncFromRemote();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("list-settings-changed", syncFromRemote);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("list-settings-changed", syncFromRemote);
    };
  }, [editor]);

  return (
    <div className="app" data-mobile-tab={mobileTab}>
      <div className="mobile-tabbar">
        <button
          className={`mobile-tab ${mobileTab === "list" ? "active" : ""}`}
          onClick={() => setMobileTab("list")}
          type="button"
        >
          List
        </button>
        <button
          className={`mobile-tab ${mobileTab === "chat" ? "active" : ""}`}
          onClick={() => setMobileTab("chat")}
          type="button"
        >
          Chat
        </button>
        <SyncStatus />
      </div>
      <div className="left">
        <ListEditor onEditorReady={onEditorReady} />
      </div>
      <div className="divider" />
      <div className="right">
        <ChatPanel editor={editor} />
      </div>
    </div>
  );
}
