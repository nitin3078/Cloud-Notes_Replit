import { Router, type IRouter } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, notesTable, noteVersionsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
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
  SetNotePasswordParams,
  SetNotePasswordBody,
  RemoveNotePasswordParams,
  VerifyNotePasswordParams,
  VerifyNotePasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List notes with optional filters
router.get("/notes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const queryParams = ListNotesQueryParams.safeParse(req.query);
  if (!queryParams.success) { res.status(400).json({ error: queryParams.error.message }); return; }
  const { folderId, pinned, deleted, sortBy } = queryParams.data;
  const conditions = [eq(notesTable.userId, req.user.id)];
  if (deleted === true) { conditions.push(eq(notesTable.isDeleted, true)); }
  else { conditions.push(eq(notesTable.isDeleted, false)); }
  if (pinned === true) { conditions.push(eq(notesTable.isPinned, true)); }
  else if (pinned === false) { conditions.push(eq(notesTable.isPinned, false)); }
  if (folderId !== undefined && folderId !== null) { conditions.push(eq(notesTable.folderId, folderId)); }
  const orderCol = sortBy === "updatedAt" ? desc(notesTable.updatedAt) : asc(notesTable.sortOrder);
  const notes = await db.select().from(notesTable).where(and(...conditions)).orderBy(orderCol);
  // Strip passwordHash before returning
  res.json(notes.map(({ passwordHash: _, ...n }) => n));
});

// Create note
router.post("/notes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.insert(notesTable).values({
    ...parsed.data,
    content: parsed.data.content ?? "",
    userId: req.user.id,
    sortOrder: parsed.data.sortOrder ?? Date.now(),
  }).returning();
  await db.insert(noteVersionsTable).values({ noteId: note.id, content: note.content });
  const { passwordHash: _, ...safeNote } = note;
  res.status(201).json(safeNote);
});

// Prevent /notes/reorder being matched as /:id
router.get("/notes/reorder", async (_req, res): Promise<void> => {
  res.status(400).json({ error: "Use POST /api/notes/reorder" });
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.select().from(notesTable).where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)));
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Update note (auto-saves version)
router.patch("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.update(notesTable).set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  if (parsed.data.content !== undefined) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [lastVersion] = await db.select().from(noteVersionsTable)
      .where(eq(noteVersionsTable.noteId, note.id)).orderBy(desc(noteVersionsTable.createdAt)).limit(1);
    const shouldSaveVersion = !lastVersion || lastVersion.content !== parsed.data.content || lastVersion.createdAt < fiveMinutesAgo;
    if (shouldSaveVersion) {
      await db.insert(noteVersionsTable).values({ noteId: note.id, content: parsed.data.content });
    }
  }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Soft delete
router.delete("/notes/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.update(notesTable).set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Restore from trash
router.post("/notes/:id/restore", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = RestoreNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.update(notesTable).set({ isDeleted: false, deletedAt: null, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Purge (permanent delete)
router.delete("/notes/:id/purge", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = PurgeNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.delete(notesTable).where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.sendStatus(204);
});

// Pin
router.post("/notes/:id/pin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = PinNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.update(notesTable).set({ isPinned: true, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Unpin
router.delete("/notes/:id/pin", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = UnpinNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.update(notesTable).set({ isPinned: false, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Reorder notes
router.post("/notes/reorder", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = ReorderNotesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updated: any[] = [];
  for (const item of parsed.data.items) {
    const [note] = await db.update(notesTable).set({ sortOrder: item.sortOrder, updatedAt: new Date() })
      .where(and(eq(notesTable.id, item.id), eq(notesTable.userId, req.user.id))).returning();
    if (note) { const { passwordHash: _, ...safeNote } = note; updated.push(safeNote); }
  }
  res.json(updated);
});

// Move note to another folder
router.post("/notes/:id/move", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = MoveNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = MoveNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.update(notesTable).set({ folderId: parsed.data.folderId, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// List note versions
router.get("/notes/:id/versions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = GetNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.select().from(notesTable).where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)));
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const versions = await db.select().from(noteVersionsTable).where(eq(noteVersionsTable.noteId, params.data.id)).orderBy(desc(noteVersionsTable.createdAt));
  res.json(versions);
});

// Restore version as copy
router.post("/notes/:id/versions/:versionId/restore-copy", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const noteId = parseInt(req.params.id, 10);
  const versionId = parseInt(req.params.versionId, 10);
  if (isNaN(noteId) || isNaN(versionId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [note] = await db.select().from(notesTable).where(and(eq(notesTable.id, noteId), eq(notesTable.userId, req.user.id)));
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const [version] = await db.select().from(noteVersionsTable).where(and(eq(noteVersionsTable.id, versionId), eq(noteVersionsTable.noteId, noteId)));
  if (!version) { res.status(404).json({ error: "Version not found" }); return; }
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const [newNote] = await db.insert(notesTable).values({
    title: `${note.title} — Restored ${dateStr}`,
    content: version.content,
    userId: req.user.id,
    folderId: note.folderId,
    sortOrder: Date.now(),
  }).returning();
  await db.insert(noteVersionsTable).values({ noteId: newNote.id, content: newNote.content });
  const { passwordHash: _, ...safeNote } = newNote;
  res.status(201).json(safeNote);
});

// Set password (lock note)
router.post("/notes/:id/lock", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = SetNotePasswordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = SetNotePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const hash = await bcrypt.hash(parsed.data.password, 10);
  const [note] = await db.update(notesTable).set({ isLocked: true, passwordHash: hash, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Remove password (unlock note)
router.delete("/notes/:id/lock", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = RemoveNotePasswordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [note] = await db.update(notesTable).set({ isLocked: false, passwordHash: null, updatedAt: new Date() })
    .where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id))).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  const { passwordHash: _, ...safeNote } = note;
  res.json(safeNote);
});

// Verify note password
router.post("/notes/:id/verify-password", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = VerifyNotePasswordParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = VerifyNotePasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.select().from(notesTable).where(and(eq(notesTable.id, params.data.id), eq(notesTable.userId, req.user.id)));
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  if (!note.passwordHash) { res.json({ valid: true }); return; }
  const valid = await bcrypt.compare(parsed.data.password, note.passwordHash);
  res.json({ valid });
});

export default router;
