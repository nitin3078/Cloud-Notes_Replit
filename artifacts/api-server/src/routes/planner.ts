import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, plannerEntriesTable } from "@workspace/db";
import {
  CreatePlannerEntryBody,
  UpdatePlannerEntryBody,
  UpdatePlannerEntryParams,
  DeletePlannerEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List all planner entries for the user, ordered by date then manual sort
// order. Intentionally sparse — there's no row for every day, only the
// dates the user actually added a task to.
router.get("/planner-entries", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const entries = await db.select().from(plannerEntriesTable)
    .where(eq(plannerEntriesTable.userId, req.user.id))
    .orderBy(asc(plannerEntriesTable.date), asc(plannerEntriesTable.sortOrder));
  res.json(entries);
});

router.post("/planner-entries", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = CreatePlannerEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db.insert(plannerEntriesTable).values({
    userId: req.user.id,
    date: parsed.data.date,
    task: parsed.data.task,
    sortOrder: Date.now(),
  }).returning();
  res.status(201).json(entry);
});

router.patch("/planner-entries/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = UpdatePlannerEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdatePlannerEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db.update(plannerEntriesTable).set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(plannerEntriesTable.id, params.data.id), eq(plannerEntriesTable.userId, req.user.id))).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json(entry);
});

router.delete("/planner-entries/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const params = DeletePlannerEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [entry] = await db.delete(plannerEntriesTable)
    .where(and(eq(plannerEntriesTable.id, params.data.id), eq(plannerEntriesTable.userId, req.user.id))).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
