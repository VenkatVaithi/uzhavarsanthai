import { describe, expect, it, vi } from "vitest";
import {
  createRequireAuth,
  resolveLocalUser,
  type UserBridgeStore,
} from "./requireAuth";

const migratedUser = {
  id: "legacy-user-id",
  email: "buyer@example.com",
  firstName: "Buyer",
  lastName: "One",
  profileImageUrl: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function store(overrides: Partial<UserBridgeStore> = {}): UserBridgeStore {
  return {
    findById: vi.fn().mockResolvedValue(undefined),
    findByEmail: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Clerk local-user bridge", () => {
  it("uses sessionClaims.userId before the Clerk-native userId", async () => {
    const bridgeStore = store({
      findById: vi.fn().mockResolvedValue(migratedUser),
    });

    const user = await resolveLocalUser(
      {
        userId: "user_clerk_native",
        sessionClaims: { userId: "legacy-user-id", email: "buyer@example.com" },
      },
      bridgeStore,
    );

    expect(user).toEqual(migratedUser);
    expect(bridgeStore.findById).toHaveBeenCalledWith("legacy-user-id");
    expect(bridgeStore.insert).not.toHaveBeenCalled();
  });

  it("links an existing local account by normalized email before inserting", async () => {
    const bridgeStore = store({
      findByEmail: vi.fn().mockResolvedValue(migratedUser),
    });

    const user = await resolveLocalUser(
      {
        userId: "user_new",
        sessionClaims: { userId: "user_new", email: " Buyer@Example.COM " },
      },
      bridgeStore,
    );

    expect(user).toEqual(migratedUser);
    expect(bridgeStore.findByEmail).toHaveBeenCalledWith("buyer@example.com");
    expect(bridgeStore.insert).not.toHaveBeenCalled();
  });

  it("provisions a new user from custom session claims", async () => {
    const inserted = { ...migratedUser, id: "user_new" };
    const bridgeStore = store({
      insert: vi.fn().mockResolvedValue(inserted),
    });

    const user = await resolveLocalUser(
      {
        userId: "user_clerk_native",
        sessionClaims: {
          userId: "user_new",
          email: "new@example.com",
          firstName: "New",
          lastName: "Buyer",
        },
      },
      bridgeStore,
    );

    expect(user).toEqual(inserted);
    expect(bridgeStore.insert).toHaveBeenCalledWith({
      id: "user_new",
      email: "new@example.com",
      firstName: "New",
      lastName: "Buyer",
    });
  });

  it("returns 401 when both the custom claim and Clerk user ID are absent", async () => {
    const bridgeStore = store();
    const req = {} as never;
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const next = vi.fn();
    const middleware = createRequireAuth(() => ({ sessionClaims: {} }), bridgeStore);

    await middleware(req, { status, json } as never, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
    expect(bridgeStore.findById).not.toHaveBeenCalled();
  });

  it("makes a signed-in account available to a protected handler", async () => {
    const bridgeStore = store({ findById: vi.fn().mockResolvedValue(migratedUser) });
    const req = {} as Parameters<ReturnType<typeof createRequireAuth>>[0];
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const next = vi.fn();
    await createRequireAuth(() => ({
      userId: "user_clerk_native",
      sessionClaims: { userId: migratedUser.id },
    }), bridgeStore)(req, { status, json } as never, next);

    expect(req.dbUser).toEqual(migratedUser);
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it("rejects an expired session even if a previous request was authenticated", async () => {
    const bridgeStore = store({ findById: vi.fn().mockResolvedValue(migratedUser) });
    let auth: { userId: string | null } = { userId: migratedUser.id };
    const middleware = createRequireAuth(() => auth, bridgeStore);
    const firstReq = {} as Parameters<typeof middleware>[0];
    const firstNext = vi.fn();
    await middleware(firstReq, {} as never, firstNext);
    expect(firstNext).toHaveBeenCalledOnce();

    auth = { userId: null };
    const expiredReq = {} as Parameters<typeof middleware>[0];
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const expiredNext = vi.fn();
    await middleware(expiredReq, { status, json } as never, expiredNext);
    expect(expiredReq.dbUser).toBeUndefined();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(expiredNext).not.toHaveBeenCalled();
    expect(bridgeStore.findById).toHaveBeenCalledTimes(1);

    // Once Clerk has refreshed the session, the next request is usable again.
    auth = { userId: migratedUser.id };
    const refreshedReq = {} as Parameters<typeof middleware>[0];
    const refreshedNext = vi.fn();
    await middleware(refreshedReq, {} as never, refreshedNext);
    expect(refreshedReq.dbUser).toEqual(migratedUser);
    expect(refreshedNext).toHaveBeenCalledOnce();
  });

  it("does not authorize a removed account when provisioning fails", async () => {
    const bridgeStore = store();
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const next = vi.fn();
    const middleware = createRequireAuth(() => ({ userId: "missing-user" }), bridgeStore);
    await middleware({} as never, { status, json } as never, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Account access unavailable" });
    expect(next).not.toHaveBeenCalled();
  });
});