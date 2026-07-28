// Thin, defensive client for a locally-running LM Studio (Gemma) instance.
// Everything fails soft: if the server is down or the response shape is
// unfamiliar, callers fall back to plain keyword matching.

const LM_BASE = process.env.LMSTUDIO_URL ?? "http://127.0.0.1:1234";

async function firstModel(): Promise<string | null> {
  try {
    const res = await fetch(`${LM_BASE}/api/v1/models`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list =
      (data as { data?: unknown[] }).data ??
      (data as { models?: unknown[] }).models ??
      [];
    const m = list[0] as Record<string, unknown> | undefined;
    return (
      (m?.id as string) ??
      (m?.key as string) ??
      (m?.name as string) ??
      null
    );
  } catch {
    return null;
  }
}

export async function aiAvailable(): Promise<boolean> {
  return (await firstModel()) !== null;
}

function extractText(data: unknown): string | null {
  const d = data as {
    // LM Studio /api/v1/chat shape: { output: [{type:'reasoning'|'message', content}] }
    output?: { type?: string; content?: string }[];
    // fallbacks for other/OpenAI-style servers
    choices?: { message?: { content?: string }; text?: string }[];
    message?: { content?: string };
    content?: string;
    response?: string;
    text?: string;
  };
  if (Array.isArray(d?.output)) {
    // Prefer the assistant message; skip the 'reasoning' block.
    const msg =
      d.output.find((o) => o.type === "message" && o.content) ??
      d.output.find((o) => o.content);
    if (msg?.content) return msg.content;
  }
  return (
    d?.choices?.[0]?.message?.content ??
    d?.choices?.[0]?.text ??
    d?.message?.content ??
    d?.content ??
    d?.response ??
    d?.text ??
    null
  );
}

async function chat(prompt: string): Promise<string | null> {
  const model = await firstModel();
  if (!model) return null;
  try {
    const res = await fetch(`${LM_BASE}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: prompt, temperature: 0.2 }),
      // Local 12B model with reasoning is slow (~5 tok/s) — allow generous time.
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    return extractText(await res.json());
  } catch {
    return null;
  }
}

function parseList(text: string): string[] {
  return text
    .replace(/^[^:]*:/, "") // drop a leading "Sure, here are…:" preamble
    .split(/[,\n]/)
    .map((s) => s.replace(/^[-*\d.\s]+/, "").trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 15);
}

/** Expand a free-text search query into related terms that mean the same thing. */
export async function expandQuery(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const out = await chat(
    `A user searched a skill-sharing marketplace for: "${query}". List up to 10 related skills, synonyms, or specific topics that would satisfy this search. Reply ONLY with a comma-separated list, no explanation.`,
  );
  return out ? parseList(out) : [];
}
