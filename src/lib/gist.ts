const FILE_NAME = "list.json";
const API_BASE = "https://api.github.com";

export type GistConfig = { token: string; id: string };

export type PullResult = {
  doc: unknown | null;
  updatedAt: string;
};

export class GistError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function parseError(res: Response): Promise<GistError> {
  let detail = res.statusText;
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) detail = body.message;
  } catch {
    // ignore
  }
  if (res.status === 401) return new GistError(`Bad token: ${detail}`, 401);
  if (res.status === 404) return new GistError(`Gist not found: ${detail}`, 404);
  if (res.status === 403) return new GistError(`Forbidden: ${detail}`, 403);
  return new GistError(`GitHub ${res.status}: ${detail}`, res.status);
}

export async function pullGist({ token, id }: GistConfig): Promise<PullResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/gists/${id}`, {
      method: "GET",
      headers: authHeaders(token),
    });
  } catch (e) {
    throw new GistError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as {
    files?: Record<string, { content?: string } | undefined>;
    updated_at?: string;
  };
  const file = body.files?.[FILE_NAME];
  const updatedAt = body.updated_at ?? new Date().toISOString();
  if (!file || typeof file.content !== "string" || file.content.length === 0) {
    return { doc: null, updatedAt };
  }
  try {
    const doc = JSON.parse(file.content);
    return { doc, updatedAt };
  } catch {
    throw new GistError(`Gist "${FILE_NAME}" is not valid JSON`);
  }
}

export async function pushGist(
  { token, id }: GistConfig,
  doc: unknown,
): Promise<{ updatedAt: string }> {
  const body = {
    files: {
      [FILE_NAME]: { content: JSON.stringify(doc, null, 2) },
    },
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/gists/${id}`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new GistError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { updated_at?: string };
  return { updatedAt: data.updated_at ?? new Date().toISOString() };
}
