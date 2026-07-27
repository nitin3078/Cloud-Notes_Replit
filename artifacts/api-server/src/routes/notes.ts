import { Router, type IRouter } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, notesTable, noteVersionsTable } from "@workspace/db";
import {
  ListNotesQueryParams,
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
  GetNoteParams,
  RestoreNoteParams,
  PurgeNoteParams,
  PinNoteParams,
  UnpinNoteParams,
  ReorderNotesBody,
  MoveNoteBody,
  MoveNoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List notes with optional filters
router.get("/notes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const queryParams = ListNotesQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { folderId, pinned, deleted, sortBy } = queryParams.data;

  // Build where conditions
  const conditions = [eq(notesTable.userId, req.user.id)];

  if (deleted === true) {
    conditions.push(eq(notesTable.isDeleted, true));
  } else {
    conditions.push(eq(notesTable.isDeleted, false));
  }

  if (pinned === true) {
    conditions.push(eq(notesTable.isPinned, true));
  } else if (pinned === false) {
    conditions.push(eq(notesTable.isPinned, false));
  }

  if (folderId !== undefined && folderId !== null) {
    conditions.push(eq(notesTable.folderId, folderId));
  }

  const orderCol = sortBy === "updatedAt"
    ? desc(notesTable.updatedAt)
    : asc(notesTable.sortOrder);

  const notes = await db
    .select()
    .from(notesTable)
    .where(and(...conditions))
    .orderBy(orderCol);

  res.json(notes);
});

// Create note
router.post("/notes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [note] = await db
    .insert(notesTable)
    .values({
      ...parsed.data,
      content: parsed.data.content ?? "",
      userId: req.user.id,
      sortOrder: parsed.data.sortOrder ?? Date.now(),
    })
    .returning();

  // Save initial version
  await db.insert(noteVersionsTable).values({
    noteId: note.id,
    content: note.content,
  });

  res.status(201).json(note);
});

// Get single note
router.get("/notes/reorder", async (req, res): Promise<void> => {
  // Placeholder to ensure /notes/reorder isn't matched as /notes/:id
  res.status(400).json({ error: "Use POST /api/notes/reorder" });
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// Update note (auto-saves version)
router.patch("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [note] = await db
    .update(notesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  // Save version snapshot if content changed
  if (parsed.data.content !== undefined) {
    // Check last version — only save if content differs from the last version within 5 min
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [lastVersion] = await db
      .select()
      .from(noteVersionsTable)
      .where(eq(noteVersionsTable.noteId, note.id))
      .orderBy(desc(noteVersionsTable.createdAt))
      .limit(1);

    const shouldSaveVersion =
      !lastVersion ||
      lastVersion.content !== parsed.data.content ||
      lastVersion.createdAt < fiveMinutesAgo;

    if (shouldSaveVersion) {
      await db.insert(noteVersionsTable).values({
        noteId: note.id,
        content: parsed.data.content,
      });
    }
  }

  res.json(note);
});

// Soft delete (move to trash)
router.delete("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// Restore from trash
router.post("/notes/:id/restore", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = RestoreNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ isDeleted: false, deletedAt: null, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// Purge (permanent delete)
router.delete("/notes/:id/purge", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = PurgeNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.sendStatus(204);
});

// Pin a note
router.post("/notes/:id/pin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = PinNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ isPinned: true, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// Unpin a note
router.delete("/notes/:id/pin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UnpinNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ isPinned: false, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// Reorder notes
router.post("/notes/reorder", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = ReorderNotesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updated: typeof notesTable.$inferSelect[] = [];
  for (const item of parsed.data.items) {
    const [note] = await db
      .update(notesTable)
      .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
      .where(and(eq(notesTable.id, item.id), eq(notesTable.userId, req.user.id)))
      .returning();
    if (note) updated.push(note);
  }

  res.json(updated);
});

// Move note to another folder
router.post("/notes/:id/move", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = MoveNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = MoveNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db
    .update(notesTable)
    .set({ folderId: parsed.data.folderId, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

// List note versions
router.get("/notes/:id/versions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify note belongs to user
  const [note] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const versions = await db
    .select()
    .from(noteVersionsTable)
    .where(eq(noteVersionsTable.noteId, params.data.id))
    .orderBy(desc(noteVersionsTable.createdAt));

  res.json(versions);
});

// Restore version as copy
router.post("/notes/:id/versions/:versionId/restore-copy", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawVersionId = Array.isArray(req.params.versionId) ? req.params.versionId[0] : req.params.versionId;
  const noteId = parseInt(rawId, 10);
  const versionId = parseInt(rawVersionId, 10);

  if (isNaN(noteId) || isNaN(versionId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [note] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, req.user.id)));
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const [version] = await db
    .select()
    .from(noteVersionsTable)
    .where(and(eq(noteVersionsTable.id, versionId), eq(noteVersionsTable.noteId, noteId)));
  if (!version) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const [newNote] = await db
    .insert(notesTable)
    .values({
      title: `${note.title} — Restored ${dateStr}`,
      content: version.content,
      userId: req.user.id,
      folderId: note.folderId,
      sortOrder: Date.now(),
    })
    .returning();

  await db.insert(noteVersionsTable).values({
    noteId: newNote.id,
    content: newNote.content,
  });

  res.status(201).json(newNote);
});

export default router;
