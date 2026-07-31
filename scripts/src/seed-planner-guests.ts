/**
 * One-off backfill: adds sample Planner tasks to the 5 guest test accounts
 * that already exist (created by seed-test-users.ts before Planner seeding
 * was added to it). Looks users up by email, so it's safe to run even if
 * some/all of them don't exist yet — those are just skipped.
 *
 * Run with: pnpm --filter @workspace/scripts run seed-planner-guests
 */
import { db, usersTable, plannerEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { format, addDays } from "date-fns";

const GUEST_EMAILS = [1, 2, 3, 4, 5].map((n) => `folio-guest${n}@example.com`);

async function main() {
  const now = Date.now();
  const items = [
    { offsetDays: 0, task: "Say hi in the AI chat" },
    { offsetDays: 1, task: "Try a note style (paint-bucket icon)" },
  ];

  for (const email of GUEST_EMAILS) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      console.log(`Skipped ${email} — no such account.`);
      continue;
    }
    for (const [i, item] of items.entries()) {
      await db.insert(plannerEntriesTable).values({
        userId: user.id,
        date: format(addDays(new Date(), item.offsetDays), "yyyy-MM-dd"),
        task: item.task,
        sortOrder: now + i,
      });
    }
    console.log(`Added ${items.length} Planner tasks for ${email}.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
