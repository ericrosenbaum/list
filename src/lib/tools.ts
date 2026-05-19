import type { Editor } from "@tiptap/react";
import type Anthropic from "@anthropic-ai/sdk";
import type { Node as PMNode } from "prosemirror-model";

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "check_task",
    description: "Mark a task as completed (checks the checkbox).",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "The data-id of the task to check." } },
      required: ["id"],
    },
  },
  {
    name: "uncheck_task",
    description: "Mark a task as not yet done (unchecks the checkbox).",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "edit_task",
    description: "Replace the text of an existing task.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        text: { type: "string", description: "The new text for the task." },
      },
      required: ["id", "text"],
    },
  },
  {
    name: "add_task",
    description:
      "Add a new task. Place it as a sibling immediately after `after_id`, or as a subtask of it when `as_subtask` is true.",
    input_schema: {
      type: "object",
      properties: {
        after_id: {
          type: "string",
          description: "The data-id of an existing task or heading. The new task goes after it.",
        },
        text: { type: "string" },
        as_subtask: { type: "boolean", default: false },
      },
      required: ["after_id", "text"],
    },
  },
  {
    name: "delete_task",
    description: "Remove an existing task (and any nested subtasks).",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "add_section",
    description:
      "Add a new heading (level 1=week, 2=day, 3=section) immediately after the node with `after_id`.",
    input_schema: {
      type: "object",
      properties: {
        after_id: { type: "string" },
        level: { type: "integer", enum: [1, 2, 3] },
        text: { type: "string" },
      },
      required: ["after_id", "level", "text"],
    },
  },
];

export type ApplyResult = { ok: boolean; message: string };

type Located = { node: PMNode; pos: number };

function findById(editor: Editor, id: string): Located | null {
  let found: Located | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.attrs?.["data-id"] === id) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

function findContainingTaskItem(editor: Editor, id: string): Located | null {
  const direct = findById(editor, id);
  if (!direct) return null;
  if (direct.node.type.name === "taskItem") return direct;
  return null;
}

function makeTaskItem(editor: Editor, text: string) {
  const schema = editor.schema;
  return schema.nodes.taskItem.create(
    { checked: false },
    schema.nodes.paragraph.create({}, text ? schema.text(text) : null),
  );
}

function makeHeading(editor: Editor, level: number, text: string) {
  const schema = editor.schema;
  return schema.nodes.heading.create({ level }, text ? schema.text(text) : null);
}

export function applyTool(
  editor: Editor,
  name: string,
  input: Record<string, unknown>,
): ApplyResult {
  try {
    switch (name) {
      case "check_task":
      case "uncheck_task": {
        const id = String(input.id ?? "");
        const target = findContainingTaskItem(editor, id);
        if (!target) return { ok: false, message: `No task with id ${id}` };
        const checked = name === "check_task";
        const tr = editor.state.tr.setNodeMarkup(target.pos, undefined, {
          ...target.node.attrs,
          checked,
        });
        editor.view.dispatch(tr);
        return { ok: true, message: `Task ${id} ${checked ? "checked" : "unchecked"}` };
      }
      case "edit_task": {
        const id = String(input.id ?? "");
        const text = String(input.text ?? "");
        const target = findContainingTaskItem(editor, id);
        if (!target) return { ok: false, message: `No task with id ${id}` };
        const schema = editor.schema;
        const newPara = schema.nodes.paragraph.create({}, text ? schema.text(text) : null);
        // Replace just the first paragraph child.
        const paraPos = target.pos + 1; // inside taskItem
        const firstChild = target.node.firstChild;
        if (!firstChild || firstChild.type.name !== "paragraph") {
          return { ok: false, message: `Task ${id} has unexpected structure` };
        }
        const tr = editor.state.tr.replaceWith(
          paraPos,
          paraPos + firstChild.nodeSize,
          newPara,
        );
        editor.view.dispatch(tr);
        return { ok: true, message: `Task ${id} updated` };
      }
      case "delete_task": {
        const id = String(input.id ?? "");
        const target = findContainingTaskItem(editor, id);
        if (!target) return { ok: false, message: `No task with id ${id}` };
        const from = target.pos;
        const to = from + target.node.nodeSize;
        const tr = editor.state.tr.delete(from, to);
        editor.view.dispatch(tr);
        return { ok: true, message: `Task ${id} deleted` };
      }
      case "add_task": {
        const afterId = String(input.after_id ?? "");
        const text = String(input.text ?? "");
        const asSubtask = Boolean(input.as_subtask);
        const target = findById(editor, afterId);
        if (!target) return { ok: false, message: `No node with id ${afterId}` };
        const schema = editor.schema;
        const newItem = makeTaskItem(editor, text);

        if (asSubtask && target.node.type.name === "taskItem") {
          // Insert into the taskItem's child taskList (or create one).
          const item = target.node;
          let nestedList: PMNode | null = null;
          let nestedListOffset = 0;
          item.forEach((child, offset) => {
            if (child.type.name === "taskList" && !nestedList) {
              nestedList = child;
              nestedListOffset = offset;
            }
          });
          if (nestedList) {
            // Insert at end of existing nested list.
            const listPos = target.pos + 1 + nestedListOffset;
            const insertAt = listPos + (nestedList as PMNode).nodeSize - 1;
            const tr = editor.state.tr.insert(insertAt, newItem);
            editor.view.dispatch(tr);
          } else {
            // Append a new taskList containing the item at end of taskItem.
            const newList = schema.nodes.taskList.create({}, newItem);
            const insertAt = target.pos + item.nodeSize - 1;
            const tr = editor.state.tr.insert(insertAt, newList);
            editor.view.dispatch(tr);
          }
          return { ok: true, message: `Subtask added under ${afterId}` };
        }

        // Sibling insert. If target is a taskItem, insert right after it in its parent taskList.
        if (target.node.type.name === "taskItem") {
          const insertAt = target.pos + target.node.nodeSize;
          const tr = editor.state.tr.insert(insertAt, newItem);
          editor.view.dispatch(tr);
          return { ok: true, message: `Task added after ${afterId}` };
        }

        // If target is a heading, insert a new taskList right after it.
        if (target.node.type.name === "heading") {
          const newList = schema.nodes.taskList.create({}, newItem);
          const insertAt = target.pos + target.node.nodeSize;
          const tr = editor.state.tr.insert(insertAt, newList);
          editor.view.dispatch(tr);
          return { ok: true, message: `Task added after heading ${afterId}` };
        }

        return { ok: false, message: `Cannot add task after node of type ${target.node.type.name}` };
      }
      case "add_section": {
        const afterId = String(input.after_id ?? "");
        const level = Number(input.level ?? 2);
        const text = String(input.text ?? "");
        const target = findById(editor, afterId);
        if (!target) return { ok: false, message: `No node with id ${afterId}` };
        const heading = makeHeading(editor, level, text);
        const insertAt = target.pos + target.node.nodeSize;
        const tr = editor.state.tr.insert(insertAt, heading);
        editor.view.dispatch(tr);
        return { ok: true, message: `Heading added` };
      }
      default:
        return { ok: false, message: `Unknown tool: ${name}` };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Apply failed: ${message}` };
  }
}

function nodeLabel(editor: Editor, id: string): string {
  const result: { value: string | null } = { value: null };
  editor.state.doc.descendants((node) => {
    if (result.value !== null) return false;
    if (node.attrs?.["data-id"] === id) {
      if (node.type.name === "taskItem") {
        const para = node.firstChild;
        result.value = para ? para.textContent : "";
      } else {
        result.value = node.textContent;
      }
      return false;
    }
    return true;
  });
  if (result.value === null) return "(unknown)";
  const trimmed = result.value.trim();
  return trimmed.length > 0 ? `"${trimmed}"` : "(empty)";
}

const HEADING_KIND: Record<number, string> = {
  1: "week heading",
  2: "day heading",
  3: "section heading",
};

export function describeTool(
  name: string,
  input: Record<string, unknown>,
  editor?: Editor,
): string {
  const label = (id: unknown) =>
    editor ? nodeLabel(editor, String(id ?? "")) : `id ${id}`;

  switch (name) {
    case "check_task":
      return `Check ${label(input.id)}`;
    case "uncheck_task":
      return `Uncheck ${label(input.id)}`;
    case "edit_task":
      return `Edit ${label(input.id)} → "${input.text}"`;
    case "add_task":
      return input.as_subtask
        ? `Add subtask under ${label(input.after_id)}: "${input.text}"`
        : `Add task after ${label(input.after_id)}: "${input.text}"`;
    case "delete_task":
      return `Delete ${label(input.id)}`;
    case "add_section": {
      const kind = HEADING_KIND[Number(input.level)] ?? `H${input.level} heading`;
      return `Add ${kind} "${input.text}" after ${label(input.after_id)}`;
    }
    default:
      return `${name}(${JSON.stringify(input)})`;
  }
}
