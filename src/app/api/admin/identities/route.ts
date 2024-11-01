import { validateAdminRequest } from "@/util/admin";
import { db } from "../../../../../drizzle/db";

/**
 * Get all identities (requires an admin JWT token)
 *
 * See /docs/identifiers.md
 */
export async function GET(req: Request) {
  const adminError = validateAdminRequest(req);
  if (adminError !== null) return adminError;

  const rows = await db.query.users.findMany({
    columns: {
      identifier: true,
      email: true,
    },
  });

  const legacyRows = await db.query.legacyIdentities.findMany({
    columns: {
      identifier: true,
      email: true,
    },
  });

  const results: Record<
    string,
    {
      email: string;
    }
  > = Object.fromEntries(
    [...rows, ...legacyRows].map((row) => [
      row.identifier,
      {
        ...row,
        identifier: undefined,
      },
    ]),
  );

  return Response.json(results);
}
