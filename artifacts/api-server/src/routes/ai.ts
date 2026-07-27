import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
  noteId?: number;
  /** When true, skip the notes-only restriction and answer with general knowledge. */
  allowGeneral?: boolean;
}

function parseChatBody(body: unknown): { data: ChatRequestBody } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };
  const b = body as Record<string, unknown>;

  if (typeof b.message !== "string" || b.message.trim().length === 0) {
    return { error: "'message' is required" };
  }

  let history: ChatMessage[] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history) || b.history.length > 20) {
      return { error: "'history' must be an array of at most 20 messages" };
    }
    for (const h of b.history) {
      if (
        !h || typeof h !== "object" ||
        (h.role !== "user" && h.role !== "assistant") ||
        typeof h.content !== "string"
      ) {
        return { error: "Each history entry needs a role ('user' | 'assistant') and string content" };
      }
    }
    history = b.history as ChatMessage[];
  }

  let noteId: number | undefined;
  if (b.noteId !== undefined) {
    if (typeof b.noteId !== "number" || !Number.isInteger(b.noteId)) {
      return { error: "'noteId' must be an integer" };
    }
    noteId = b.noteId;
  }

  const allowGeneral = b.allowGeneral === true;

  return { data: { message: b.message, history, noteId, allowGeneral } };
}

const MAX_CONTEXT_CHARS = 60_000; // keeps the prompt comfortably within context limits
// Overridable via env var in case Google renames/deprecates this model later.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildNotesContext(userId: string, noteId?: number): Promise<string> {
  const conditions = [eq(notesTable.userId, userId), eq(notesTable.isDeleted, false)];
  if (noteId !== undefined) conditions.push(eq(notesTable.id, noteId));

  const notes = await db
    .select()
    .from(notesTable)
    .where(and(...conditions))
    .orderBy(desc(notesTable.updatedAt));

  let context = "";
  for (const note of notes) {
    const block = `## ${note.title}\n${stripHtml(note.content)}\n\n`;
    if (context.length + block.length > MAX_CONTEXT_CHARS) break;
    context += block;
  }
  return context;
}

// Ask the AI a question grounded in the user's notes
router.post("/ai/chat", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI chat isn't configured yet. Set the GEMINI_API_KEY environment variable." });
    return;
  }

  const parsed = parseChatBody(req.body);
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const { message, history = [], noteId, allowGeneral } = parsed.data;

  const notesContext = await buildNotesContext(req.user.id, noteId);
  if (!notesContext && !noteId && !allowGeneral) {
    res.json({
      reply: "You don't have any notes yet, so I don't have anything to answer from. Create a note first, then ask me about it.",
    });
    return;
  }

  const NO_ANSWER_MARKER = "NOTES_NO_ANSWER";

  const systemPrompt = allowGeneral
    ? [
        "You are a helpful, knowledgeable general-purpose assistant embedded in a personal notes app called Folio.",
        "Answer the user's question using your own general knowledge. Be concise and accurate.",
        "You may also use the following notes as extra context if relevant, but you are not limited to them.",
        "",
        "=== USER'S NOTES (optional context) ===",
        notesContext || "(none)",
        "=== END OF NOTES ===",
      ].join("\n")
    : [
        "You are a helpful assistant embedded in a personal notes app called Folio.",
        "You can do two kinds of things: (1) answer questions using ONLY the notes provided below, and",
        "(2) when asked, DRAFT new content the user wants added to a note (a summary, a list, a rewrite, etc).",
        `If the user asks a factual question and the answer is NOT in the notes, respond with EXACTLY the single word ${NO_ANSWER_MARKER} and nothing else — no punctuation, no explanation.`,
        "If the user asks you to write/add/draft something, just write the requested content directly and",
        "concisely — the user will choose whether to insert it into their note, so don't add meta-commentary",
        "like \"Here's a draft\" unless it's helpful context.",
        "Be concise and reference the relevant note title(s) when useful for Q&A.",
        "",
        "=== USER'S NOTES ===",
        notesContext || "(this note is currently empty)",
        "=== END OF NOTES ===",
      ].join("\n");

  // Gemini uses "model" as the role name for prior assistant turns (not "assistant").
  const geminiHistory = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...geminiHistory,
          { role: "user", parts: [{ text: message }] },
        ],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    req.log?.error({ status: response.status, detail }, "Gemini API error");
    res.status(502).json({ error: "The AI service failed to respond. Please try again." });
    return;
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const reply = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim() || "I couldn't generate a response. Please try again.";

  if (!allowGeneral && reply.trim() === NO_ANSWER_MARKER) {
    res.json({
      reply: "I couldn't find an answer to that in your notes.",
      noAnswerInNotes: true,
    });
    return;
  }

  res.json({ reply });
});

export default router;
