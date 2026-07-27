import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, notesTable, foldersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  const [totalNotesResult] = await db
    .select({ count: count() })
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isDeleted, false)));

  const [pinnedResult] = await db
    .select({ count: count() })
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isPinned, true), eq(notesTable.isDeleted, false)));

  const [trashedResult] = await db
    .select({ count: count() })
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isDeleted, true)));

  const [totalFoldersResult] = await db
    .select({ count: count() })
    .from(foldersTable)
    .where(eq(foldersTable.userId, userId));

  const recentlyEdited = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.isDeleted, false)))
    .orderBy(desc(notesTable.updatedAt))
    .limit(5);

  res.json({
    totalNotes: totalNotesResult.count,
    totalFolders: totalFoldersResult.count,
    pinnedNotes: pinnedResult.count,
    trashedNotes: trashedResult.count,
    recentlyEdited,
  });
});

export default router;
