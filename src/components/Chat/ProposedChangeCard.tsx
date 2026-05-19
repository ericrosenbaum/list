import type { Editor } from "@tiptap/react";
import { describeTool } from "../../lib/tools";
import type { ToolUseBlock } from "../../types";

type Props = {
  toolUses: ToolUseBlock[];
  editor: Editor | null;
  onApproveAll: () => void;
  onRejectAll: (reason?: string) => void;
  disabled?: boolean;
};

export function ProposedChangeCard({ toolUses, editor, onApproveAll, onRejectAll, disabled }: Props) {
  return (
    <div className="proposed-card">
      <div className="proposed-header">Proposed changes</div>
      <ul className="proposed-list">
        {toolUses.map((t) => (
          <li key={t.id}>
            {describeTool(t.name, (t.input ?? {}) as Record<string, unknown>, editor ?? undefined)}
          </li>
        ))}
      </ul>
      <div className="proposed-actions">
        <button
          className="btn approve"
          onClick={onApproveAll}
          disabled={disabled}
        >
          Approve
        </button>
        <button
          className="btn reject"
          onClick={() => onRejectAll()}
          disabled={disabled}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
