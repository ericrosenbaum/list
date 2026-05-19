import type { Editor } from "@tiptap/react";
import type { AnthropicMessageParam, ContentBlockParam } from "../../types";
import { describeTool } from "../../lib/tools";

type Props = { message: AnthropicMessageParam; editor: Editor | null };

function blockToReact(block: ContentBlockParam, key: number, editor: Editor | null) {
  if (typeof block === "string") return <span key={key}>{block}</span>;
  switch (block.type) {
    case "text":
      return (
        <p key={key} className="msg-text">
          {block.text}
        </p>
      );
    case "tool_use":
      return (
        <div key={key} className="msg-tooluse">
          <span className="msg-tooluse-label">proposed:</span>{" "}
          {describeTool(block.name, (block.input ?? {}) as Record<string, unknown>, editor ?? undefined)}
        </div>
      );
    case "tool_result": {
      const content = block.content;
      let text = "";
      if (typeof content === "string") text = content;
      else if (Array.isArray(content)) {
        text = content
          .map((c) => (c.type === "text" ? c.text : ""))
          .filter(Boolean)
          .join(" ");
      }
      const cls = block.is_error ? "msg-toolresult error" : "msg-toolresult";
      return (
        <div key={key} className={cls}>
          {block.is_error ? "rejected" : "applied"}
          {text ? `: ${text}` : ""}
        </div>
      );
    }
    default:
      return null;
  }
}

export function MessageView({ message, editor }: Props) {
  const blocks =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content;
  return (
    <div className={`msg ${message.role}`}>
      <div className="msg-role">{message.role === "user" ? "you" : "claude"}</div>
      <div className="msg-body">
        {blocks.map((b, i) => blockToReact(b as ContentBlockParam, i, editor))}
      </div>
    </div>
  );
}
