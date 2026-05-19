import type { ChatSession } from "../../types";

type Props = {
  chats: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function ChatHistoryMenu({ chats, activeId, onSelect, onClose }: Props) {
  const sorted = [...chats].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="popover-backdrop" onClick={onClose}>
      <div className="popover" onClick={(e) => e.stopPropagation()}>
        <div className="popover-title">Recent chats</div>
        {sorted.length === 0 && <div className="popover-empty">No chats yet.</div>}
        <ul className="chat-list">
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                className={`chat-list-item ${c.id === activeId ? "active" : ""}`}
                onClick={() => {
                  onSelect(c.id);
                  onClose();
                }}
              >
                <div className="chat-list-title">{c.title || "(empty)"}</div>
                <div className="chat-list-date">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
