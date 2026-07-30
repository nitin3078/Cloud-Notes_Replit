import { Router, type IRouter } from "express";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tags", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notes = await db.select({ tags: notesTable.tags }).from(notesTable)
    .where(and(eq(notesTable.userId, req.user.id), eq(notesTable.isDeleted, false)));

  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const result = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json(result);
});

export default router;
