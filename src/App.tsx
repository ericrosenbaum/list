import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ListEditor } from "./components/Editor/ListEditor";
import { ChatPanel } from "./components/Chat/ChatPanel";

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const onEditorReady = useCallback((e: Editor) => setEditor(e), []);

  return (
    <div className="app">
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
