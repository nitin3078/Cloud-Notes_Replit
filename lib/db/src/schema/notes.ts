import { pgTable, text, serial, timestamp, boolean, integer, bigint, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const foldersTable = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentFolderId: integer("parent_folder_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  folderId: integer("folder_id"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  // bigint, not integer: sortOrder is seeded with Date.now() (a ~13-digit ms
  // timestamp), which overflows Postgres's 32-bit integer range (~2.1 billion).
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  color: varchar("color"),
  isLocked: boolean("is_locked").notNull().default(false),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const noteVersionsTable = pgTable("note_versions", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFolderSchema = createInsertSchema(foldersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof foldersTable.$inferSelect;

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;

export const insertNoteVersionSchema = createInsertSchema(noteVersionsTable).omit({ id: true, createdAt: true });
export type InsertNoteVersion = z.infer<typeof insertNoteVersionSchema>;
export type NoteVersion = typeof noteVersionsTable.$inferSelect;
