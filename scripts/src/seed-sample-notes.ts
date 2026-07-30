/**
 * One-off script: inserts 5 sample notes for the first (only) user in the
 * database, showcasing folders, tags, and a few note styles. Safe to run
 * multiple times — it always creates new notes, so re-run only if you
 * actually want duplicates.
 *
 * Run with: pnpm --filter @workspace/scripts run seed
 */
import { db, notesTable, usersTable } from "@workspace/db";
import { asc } from "drizzle-orm";

async function main() {
  const [user] = await db.select().from(usersTable).orderBy(asc(usersTable.createdAt)).limit(1);
  if (!user) {
    console.error("No user found — log into the app at least once before running this script.");
    process.exit(1);
  }

  const now = Date.now();

  const notes = [
    {
      title: "Welcome to Folio",
      noteStyle: "default",
      tags: ["welcome"],
      isPinned: true,
      content: `
        <h1>Welcome to Folio 👋</h1>
        <p>This is your personal notes app. A few things worth trying:</p>
        <ul>
          <li>Click the palette icon to change your theme, or make your own custom colors.</li>
          <li>Give a note its own look — try the style picker (paint bucket icon) inside any note.</li>
          <li>Ask the AI about your notes using the "Ask your notes" button, or the floating "Ask AI" button inside a note.</li>
          <li>Try dragging this note onto a folder in the sidebar.</li>
        </ul>
      `.trim(),
    },
    {
      title: "Chocolate Chip Cookies",
      noteStyle: "pdf",
      tags: ["recipes"],
      isPinned: false,
      content: `
        <h1>Chocolate Chip Cookies</h1>
        <p>Makes about 24 cookies. Prep: 15 min, Bake: 10 min.</p>
        <h2>Ingredients</h2>
        <ul>
          <li>2 1/4 cups all-purpose flour</li>
          <li>1 cup butter, softened</li>
          <li>3/4 cup brown sugar</li>
          <li>2 large eggs</li>
          <li>2 cups chocolate chips</li>
        </ul>
        <h2>Steps</h2>
        <ol>
          <li>Cream butter and sugar together.</li>
          <li>Beat in eggs one at a time.</li>
          <li>Mix in flour, then fold in chocolate chips.</li>
          <li>Bake at 375°F for 9-11 minutes.</li>
        </ol>
      `.trim(),
    },
    {
      title: "Team Standup Notes",
      noteStyle: "notebook",
      tags: ["work"],
      isPinned: false,
      content: `
        <h1>Team Standup — Monday</h1>
        <p><strong>Attendees:</strong> full team</p>
        <h2>Updates</h2>
        <ul>
          <li>Backend: finished the search endpoint, starting on rate limiting next.</li>
          <li>Frontend: tags UI is in review.</li>
          <li>Design: exploring a dark mode variant.</li>
        </ul>
        <h2>Blockers</h2>
        <ul data-checked="false">
          <li data-list="unchecked">Waiting on API key for the new integration</li>
          <li data-list="checked">Staging environment — resolved</li>
        </ul>
      `.trim(),
    },
    {
      title: "useDebounce Hook",
      noteStyle: "terminal",
      tags: ["dev"],
      isPinned: false,
      content: `
        <h1>useDebounce Hook</h1>
        <p>A small reusable hook for debouncing a fast-changing value (e.g. search input).</p>
        <pre><code>function useDebounce(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}</code></pre>
      `.trim(),
    },
    {
      title: "Weekend To-Do",
      noteStyle: "kraft",
      tags: ["personal"],
      isPinned: false,
      content: `
        <h1>Weekend To-Do</h1>
        <ul data-checked="false">
          <li data-list="unchecked">Grocery run</li>
          <li data-list="unchecked">Call the dentist</li>
          <li data-list="checked">Finish the book I'm reading</li>
          <li data-list="unchecked">Clean out the garage</li>
        </ul>
      `.trim(),
    },
  ];

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
    console.log(`Created: ${note.title}`);
  }

  console.log(`\nDone — 5 sample notes created for user ${user.email ?? user.id}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
