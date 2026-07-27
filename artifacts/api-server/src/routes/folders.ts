import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, foldersTable } from "@workspace/db";
import {
  CreateFolderBody,
  UpdateFolderBody,
  UpdateFolderParams,
  DeleteFolderParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/folders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const folders = await db
    .select()
    .from(foldersTable)
    .where(eq(foldersTable.userId, req.user.id))
    .orderBy(foldersTable.createdAt);
  res.json(folders);
});

router.post("/folders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [folder] = await db
    .insert(foldersTable)
    .values({ ...parsed.data, userId: req.user.id })
    .returning();
  res.status(201).json(folder);
});

router.patch("/folders/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateFolderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [folder] = await db
    .update(foldersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(foldersTable.id, params.data.id), eq(foldersTable.userId, req.user.id)))
    .returning();
  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.json(folder);
});

router.delete("/folders/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteFolderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [folder] = await db
    .delete(foldersTable)
    .where(and(eq(foldersTable.id, params.data.id), eq(foldersTable.userId, req.user.id)))
    .returning();
  if (!folder) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
