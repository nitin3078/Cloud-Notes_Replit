/**
 * One-off diagnostic: creates a single test account with a deliberately
 * simple, easy-to-type password (no random characters), so login can be
 * tested by hand with zero copy-paste risk. Use this to isolate whether
 * login itself is broken, or whether it was just a mistyped/miscopied
 * complex password on the other accounts.
 *
 * Run with: pnpm --filter @workspace/scripts run seed-diagnostic-user
 *
 * Login with:
 *   Email:    diagnostic@folio.test
 *   Password: test1234
 */
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const EMAIL = "diagnostic@folio.test";
const PASSWORD = "test1234";

async function main() {
  // Clean up any previous run so this is safe to re-run.
  await db.delete(usersTable).where(eq(usersTable.email, EMAIL));

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [user] = await db.insert(usersTable).values({
    email: EMAIL,
    firstName: "Diagnostic",
    passwordHash,
  }).returning();

  console.log("Created diagnostic account:");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  User ID:  ${user.id}`);
  console.log("\nNow go log in with these exact credentials on the login page.");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
