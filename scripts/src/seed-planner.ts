/**
 * One-off script: adds a few sample Planner tasks for the first (only) user
 * — today, tomorrow, and a few days out — so the Planner and the ticker
 * bar have something real to show. Safe to run multiple times, but each
 * run adds new tasks rather than checking for duplicates, so only re-run
 * if you actually want more.
 *
 * Run with: pnpm --filter @workspace/scripts run seed-planner
 */
import { db, usersTable, plannerEntriesTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { format, addDays } from "date-fns";

async function main() {
  const [user] = await db.select().from(usersTable).orderBy(asc(usersTable.createdAt)).limit(1);
  if (!user) {
    console.error("No user found — log into the app at least once before running this script.");
    process.exit(1);
  }

  const now = Date.now();
  const items = [
    { offsetDays: 0, task: "Try the ticker bar at the top of the app" },
    { offsetDays: 0, task: "Ask the AI what's due today" },
    { offsetDays: 1, task: "Explore the different note styles" },
    { offsetDays: 3, task: "Try dragging a note onto a folder" },
  ];

  for (const [i, item] of items.entries()) {
    await db.insert(plannerEntriesTable).values({
      userId: user.id,
      date: format(addDays(new Date(), item.offsetDays), "yyyy-MM-dd"),
      task: item.task,
      sortOrder: now + i,
    });
  }

  console.log(`Done — ${items.length} Planner tasks created for ${user.email ?? user.id}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
