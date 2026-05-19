import { useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { IdAttr } from "./extensions/IdAttr";
import { loadDoc, saveDoc } from "../../lib/storage";
import { pushDoc } from "../../lib/sync";
import { INITIAL_DOC } from "./initialDoc";

type Props = {
  onEditorReady: (editor: Editor) => void;
};

export function ListEditor({ onEditorReady }: Props) {
  const saveTimer = useRef<number | null>(null);
  const initialContent = loadDoc() ?? INITIAL_DOC;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      IdAttr,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const json = editor.getJSON();
        saveDoc(json);
        pushDoc(json);
      }, 300);
    },
  });

  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="editor-wrap">
      <EditorContent editor={editor} className="editor" />
    </div>
  );
}
