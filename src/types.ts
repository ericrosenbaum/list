import type Anthropic from "@anthropic-ai/sdk";

export type AnthropicMessageParam = Anthropic.MessageParam;
export type ContentBlockParam = Anthropic.ContentBlockParam;
export type ToolUseBlock = Anthropic.ToolUseBlock;
export type TextBlock = Anthropic.TextBlock;

export type ChatSession = {
  id: string;
  createdAt: string;
  title: string;
  messages: AnthropicMessageParam[];
  pendingToolUses?: ToolUseBlock[];
};

export type ToolName =
  | "check_task"
  | "uncheck_task"
  | "edit_task"
  | "add_task"
  | "delete_task"
  | "add_section";

export type ToolInputByName = {
  check_task: { id: string };
  uncheck_task: { id: string };
  edit_task: { id: string; text: string };
  add_task: { after_id: string; text: string; as_subtask?: boolean };
  delete_task: { id: string };
  add_section: { after_id: string; level: 1 | 2 | 3; text: string };
};

export type AppSettings = {
  apiKey: string;
  model: string;
  gistToken: string;
  gistId: string;
};

export type SyncState =
  | { kind: "idle" }
  | { kind: "pulling" }
  | { kind: "pushing" }
  | { kind: "offline" }
  | { kind: "error"; message: string };
