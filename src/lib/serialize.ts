type Node = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  text?: string;
};

function textOf(node: Node | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(textOf).join("");
}

function idOf(node: Node): string {
  const v = node.attrs?.["data-id"];
  return typeof v === "string" ? v : "";
}

function serializeTaskItem(item: Node, depth: number, out: string[]): void {
  const indent = "  ".repeat(depth);
  const checked = item.attrs?.checked === true;
  const box = checked ? "[x]" : "[ ]";
  // First paragraph child is the task text. Nested taskList is the subtree.
  const firstPara = item.content?.find((c) => c.type === "paragraph");
  const nestedList = item.content?.find((c) => c.type === "taskList");
  const text = textOf(firstPara).trim();
  const id = idOf(item);
  out.push(`${indent}- ${box} ${text} {id:${id}}`);
  if (nestedList?.content) {
    for (const child of nestedList.content) {
      if (child.type === "taskItem") serializeTaskItem(child, depth + 1, out);
    }
  }
}

function serializeNode(node: Node, out: string[]): void {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const hashes = "#".repeat(Math.max(1, Math.min(6, level)));
      const id = idOf(node);
      const tail = id ? ` {id:${id}}` : "";
      out.push(`${hashes} ${textOf(node).trim()}${tail}`);
      break;
    }
    case "taskList":
      if (node.content) {
        for (const item of node.content) {
          if (item.type === "taskItem") serializeTaskItem(item, 0, out);
        }
      }
      break;
    case "bulletList":
    case "orderedList":
      if (node.content) {
        for (const item of node.content) {
          const t = textOf(item).trim();
          if (t) out.push(`- ${t}`);
        }
      }
      break;
    case "paragraph": {
      const t = textOf(node).trim();
      if (t) out.push(t);
      break;
    }
    default:
      if (node.content) {
        for (const child of node.content) serializeNode(child, out);
      }
  }
}

export function serializeDoc(doc: unknown): string {
  const root = doc as Node | null;
  if (!root || !root.content) return "(empty list)";
  const out: string[] = [];
  for (const node of root.content) serializeNode(node, out);
  return out.join("\n");
}
