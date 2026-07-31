/**
 * One-off script: creates 5 test user accounts (email/password), each with
 * a few sample notes, so you can hand out real logins for other people to
 * try Folio. Prints the generated credentials to the console — copy them
 * from there, they are not stored anywhere in plain text.
 *
 * Run with: pnpm --filter @workspace/scripts run seed-test-users
 */
import { db, usersTable, notesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

function generatePassword(): string {
  // 12 chars, letters+digits, avoiding visually ambiguous characters (0/O, 1/l/I).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomFillSync(new Uint8Array(12)))
    .map((b) => chars[b % chars.length])
    .join("");
}

const TEST_USERS = [1, 2, 3, 4, 5].map((n) => ({
  email: `folio-guest${n}@example.com`,
  firstName: `Guest ${n}`,
  password: generatePassword(),
}));

const sampleNotesFor = (label: string) => [
  {
    title: "Welcome to Folio",
    noteStyle: "default",
    tags: ["welcome"],
    isPinned: true,
    content: `<h1>Welcome, ${label}! 👋</h1><p>This is a guest account for trying out Folio. Feel free to create, edit, and delete notes — explore themes, note styles, tags, the AI chat, and the Planner.</p>`,
  },
  {
    title: "Try the AI chat",
    noteStyle: "default",
    tags: ["demo"],
    isPinned: false,
    content: `<h1>Try the AI chat</h1><p>Use the "Ask your notes" button in the sidebar, or the floating "Ask AI" button inside any note. Try asking it to summarize this note, or draft something new.</p>`,
  },
  {
    title: "Sample Recipe",
    noteStyle: "pdf",
    tags: ["recipes"],
    isPinned: false,
    content: `<h1>Simple Pancakes</h1><ul><li>1 cup flour</li><li>1 egg</li><li>1 cup milk</li><li>1 tbsp sugar</li></ul><p>Mix and cook on a griddle until golden.</p>`,
  },
];

async function main() {
  console.log("Creating 5 test users...\n");
  const results: { email: string; password: string }[] = [];

  for (const u of TEST_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ email: u.email, firstName: u.firstName, passwordHash })
      .onConflictDoNothing({ target: usersTable.email })
      .returning();

    if (!user) {
      console.log(`Skipped ${u.email} — an account with this email already exists.`);
      continue;
    }

    const now = Date.now();
    const notes = sampleNotesFor(u.firstName);
    for (const [i, note] of notes.entries()) {
      await db.insert(notesTable).values({
        userId: user.id,
        title: note.title,
        content: note.content,
        noteStyle: note.noteStyle,
        tags: note.tags,
        isPinned: note.isPinned,
        sortOrder: now + i,
      });
    }

    results.push({ email: u.email, password: u.password });
    console.log(`Created ${u.email} with ${notes.length} sample notes.`);
  }

  console.log("\n=== Credentials to share (copy these now — not stored anywhere) ===");
  console.log("Email".padEnd(28) + "Password");
  console.log("-".repeat(45));
  for (const r of results) {
    console.log(r.email.padEnd(28) + r.password);
  }
  console.log("\nTell people to log in via the 'Log In' tab on your login page (not 'Continue with Replit').");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
