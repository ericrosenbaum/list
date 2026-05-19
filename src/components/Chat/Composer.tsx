import { useState, KeyboardEvent } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function Composer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  function send() {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSend(t);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="composer">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={disabled ? "Approve or reject the proposed change first…" : "Message…"}
        rows={2}
        disabled={disabled}
      />
      <button className="btn send" onClick={send} disabled={disabled || !text.trim()}>
        Send
      </button>
    </div>
  );
}
