import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFS } from "./tools";
import type { AnthropicMessageParam } from "../types";

const SYSTEM_INSTRUCTIONS = `You are a focused ADHD coach helping the user work through their to-do list one task at a time.

Default behavior: tell them the single next thing to do. When they say "done", confirm briefly and pick the next one. Be concise — usually one or two sentences. Avoid long lists; the goal is to keep cognitive load low.

You may chat about how long a task is taking or will take if the user asks or if it seems relevant. You know the current local time (provided below).

You have tools to propose edits to the list. Every edit requires the user's explicit approval, so propose freely when it helps — for example, check off a task when the user says they finished it, add a task they mention, or suggest splitting a vague task into smaller ones. Explain briefly in your text response what you're proposing and why.

The user can also edit the list directly in the editor (typing, checking boxes, adding sections). The list state shown below is always the current source of truth — items may appear, change, or get checked off without going through you. Don't be surprised by changes between turns, and don't re-propose an edit the user has already made manually.

Use the data-ids in the list state below to target tasks with tools.`;

export type SendTurnArgs = {
  apiKey: string;
  model: string;
  listMarkdown: string;
  currentTime: string;
  messages: AnthropicMessageParam[];
};

export async function sendTurn(args: SendTurnArgs): Promise<Anthropic.Message> {
  const client = new Anthropic({ apiKey: args.apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: args.model,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_INSTRUCTIONS,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `Current time: ${args.currentTime}\n\nCurrent list state:\n\n${args.listMarkdown}`,
      },
    ],
    tools: TOOL_DEFS,
    messages: args.messages,
  });
  return response;
}
