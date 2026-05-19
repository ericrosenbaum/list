function task(text: string, checked = false, children: unknown[] = []) {
  const item: Record<string, unknown> = {
    type: "taskItem",
    attrs: { checked },
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
  if (children.length > 0) {
    (item.content as unknown[]).push({ type: "taskList", content: children });
  }
  return item;
}

function heading(level: 1 | 2 | 3, text: string) {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function taskList(items: unknown[]) {
  return { type: "taskList", content: items };
}

export const INITIAL_DOC = {
  type: "doc",
  content: [
    heading(1, "5/18 - 5/22"),
    heading(2, "Monday"),
    heading(3, "Admin"),
    taskList([
      task("Welcome — try checking this off", false),
      task("Edit me, indent with Tab to make subtasks", false, [task("A subtask", false)]),
    ]),
    heading(3, "Prototyping"),
    taskList([task("Build the to-do app", false)]),
  ],
};
