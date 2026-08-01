/**
 * Creates 5 rich guest accounts — each with folders (including a
 * subfolder), several notes with varied colors/styles/tags, and Planner
 * entries. Meant to be run ONCE against whichever database DATABASE_URL
 * points at when you run it.
 *
 * IMPORTANT: run this with the PRODUCTION database URL explicitly, since
 * the Shell's default DATABASE_URL points at the separate Development
 * database that your live deployed app never reads from:
 *
 *   DATABASE_URL="<production-connection-string>" pnpm --filter @workspace/scripts run seed-production-guests
 *
 * Safe to re-run — accounts that already exist (by email) are skipped
 * entirely, not duplicated.
 */
import { db, usersTable, notesTable, foldersTable, plannerEntriesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { format, addDays } from "date-fns";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomFillSync(new Uint8Array(12)))
    .map((b) => chars[b % chars.length])
    .join("");
}

const GUESTS = [1, 2, 3, 4, 5].map((n) => ({
  email: `folio-guest${n}@example.com`,
  firstName: `Guest ${n}`,
  password: generatePassword(),
}));

async function seedOneUser(userId: string, now: number) {
  // Folders: Work (with a Projects subfolder) and Personal.
  const [workFolder] = await db.insert(foldersTable).values({ userId, name: "Work" }).returning();
  const [projectsFolder] = await db.insert(foldersTable).values({ userId, name: "Projects", parentFolderId: workFolder.id }).returning();
  const [personalFolder] = await db.insert(foldersTable).values({ userId, name: "Personal" }).returning();

  const notes = [
    {
      title: "Welcome to Folio",
      folderId: null,
      isPinned: true,
      noteStyle: "default",
      color: "#60A5FA",
      tags: ["welcome"],
      content: "<h1>Welcome! 👋</h1><p>This is your own Folio account. Explore folders, tags, themes, note styles, the AI chat, and the Planner.</p>",
    },
    {
      title: "Team Meeting Notes",
      folderId: workFolder.id,
      isPinned: false,
      noteStyle: "notebook",
      color: "#FCD34D",
      tags: ["work"],
      content: "<h1>Team Meeting</h1><ul><li>Reviewed roadmap</li><li>Discussed launch timeline</li><li>Assigned action items</li></ul>",
    },
    {
      title: "Project Ideas",
      folderId: projectsFolder.id,
      isPinned: false,
      noteStyle: "default",
      color: "#A78BFA",
      tags: ["work", "ideas"],
      content: "<h1>Project Ideas</h1><ul><li>Mobile app redesign</li><li>Customer feedback portal</li><li>Automated reporting dashboard</li></ul>",
    },
    {
      title: "Grocery List",
      folderId: personalFolder.id,
      isPinned: false,
      noteStyle: "kraft",
      color: "#4ADE80",
      tags: ["personal"],
      content: '<h1>Grocery List</h1><ul data-checked="false"><li data-list="unchecked">Milk</li><li data-list="unchecked">Eggs</li><li data-list="checked">Bread</li></ul>',
    },
    {
      title: "Pasta Recipe",
      folderId: personalFolder.id,
      isPinned: false,
      noteStyle: "pdf",
      color: "#FB923C",
      tags: ["recipes"],
      content: "<h1>Simple Pasta</h1><ul><li>Pasta</li><li>Olive oil</li><li>Garlic</li><li>Parmesan</li></ul><p>Boil pasta, saut\u00e9 garlic in oil, toss together, top with cheese.</p>",
    },
  ];

  for (const [i, note] of notes.entries()) {
    await db.insert(notesTable).values({
      userId,
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      noteStyle: note.noteStyle,
      color: note.color,
      tags: note.tags,
      isPinned: note.isPinned,
      sortOrder: now + i,
    });
  }

  const plannerItems = [
    { offsetDays: 0, task: "Reply to team emails" },
    { offsetDays: 0, task: "Review project ideas note" },
    { offsetDays: 1, task: "Prep for team meeting" },
    { offsetDays: 3, task: "Follow up on grocery list" },
  ];
  for (const [i, item] of plannerItems.entries()) {
    await db.insert(plannerEntriesTable).values({
      userId,
      date: format(addDays(new Date(), item.offsetDays), "yyyy-MM-dd"),
      task: item.task,
      sortOrder: now + i,
    });
  }
}

async function main() {
  console.log("Creating 5 guest accounts with folders, notes, tags, colors, and Planner entries...\n");
  const results: { email: string; password: string }[] = [];

  for (const g of GUESTS) {
    const passwordHash = await bcrypt.hash(g.password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ email: g.email, firstName: g.firstName, passwordHash })
      .onConflictDoNothing({ target: usersTable.email })
      .returning();

    if (!user) {
      console.log(`Skipped ${g.email} — an account with this email already exists.`);
      continue;
    }

    await seedOneUser(user.id, Date.now());
    results.push({ email: g.email, password: g.password });
    console.log(`Created ${g.email} with folders, 5 notes, tags, and Planner entries.`);
  }

  console.log("\n=== Credentials to share (copy these now) ===");
  console.log("Email".padEnd(28) + "Password");
  console.log("-".repeat(45));
  for (const r of results) {
    console.log(r.email.padEnd(28) + r.password);
  }
  console.log("\nTell people to use the 'Log In' tab (email/password), not 'Continue with Replit'.");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
