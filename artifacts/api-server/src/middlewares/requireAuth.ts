import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

function claimAsString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type DbUser = typeof usersTable.$inferSelect;

export interface BridgeAuth {
  userId?: string | null;
  sessionClaims?: Record<string, unknown> | null;
}

export interface UserBridgeStore {
  findById(id: string): Promise<DbUser | undefined>;
  findByEmail(email: string): Promise<DbUser | undefined>;
  insert(values: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }): Promise<DbUser | undefined>;
}

const userBridgeStore: UserBridgeStore = {
  async findById(id) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    return user;
  },
  async findByEmail(email) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email}`)
      .limit(1);
    return user;
  },
  async insert(values) {
    const [user] = await db
      .insert(usersTable)
      .values(values)
      .onConflictDoNothing()
      .returning();
    return user;
  },
};

export async function resolveLocalUser(
  auth: BridgeAuth,
  store: UserBridgeStore,
): Promise<DbUser | undefined> {
  const legacyUserId =
    claimAsString(auth.sessionClaims?.userId) ?? claimAsString(auth.userId);

  if (!legacyUserId) {
    return undefined;
  }

  let dbUser = await store.findById(legacyUserId);

  const email = claimAsString(auth.sessionClaims?.email)?.toLowerCase() ?? null;

  if (!dbUser && email) {
    dbUser = await store.findByEmail(email);
  }

  if (!dbUser) {
    dbUser = await store.insert({
      id: legacyUserId,
      email,
      firstName: claimAsString(auth.sessionClaims?.firstName),
      lastName: claimAsString(auth.sessionClaims?.lastName),
    });

    dbUser ??= await store.findById(legacyUserId);
  }

  return dbUser;
}

export function createRequireAuth(
  readAuth: (req: Request) => BridgeAuth = (req) => getAuth(req),
  store: UserBridgeStore = userBridgeStore,
) {
  return async function requireClerkAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const auth = readAuth(req);
    const hasIdentity =
      claimAsString(auth.sessionClaims?.userId) ?? claimAsString(auth.userId);

    if (!hasIdentity) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const dbUser = await resolveLocalUser(auth, store);

    if (!dbUser) {
      res.status(403).json({ error: "Account access unavailable" });
      return;
    }

    req.dbUser = dbUser;
    next();
  };
}

export const requireAuth = createRequireAuth();