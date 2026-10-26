import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  getUser: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  returning: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  getAuth: (req: express.Request) => ({ userId: req.headers["x-test-user"] ?? null }),
  clerkClient: { users: { getUser: fixtures.getUser } },
}));

vi.mock("@workspace/db", async () => ({
  ...await import("../../../../lib/db/src/schema"),
  db: { select: fixtures.select, update: fixtures.update },
}));

vi.mock("../middlewares/requireAuth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../middlewares/requireAuth")>();
  const { getAuth } = await import("@clerk/express");
  return {
    ...original,
    requireAuth: original.createRequireAuth(getAuth, {
      findById: async (id) => ({
        id, email: "buyer@example.test", firstName: null, lastName: null,
        profileImageUrl: null, createdAt: new Date(), updatedAt: new Date(),
      }),
      findByEmail: async () => undefined,
      insert: async () => undefined,
    }),
  };
});

import ordersRouter from "./orders";

const app = express();
app.use(express.json());
app.use("/api", ordersRouter);
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: "Internal server error" });
});

const order = {
  id: 42, buyerName: "Buyer", buyerEmail: "buyer@example.test",
  status: "fulfilled", totalAmount: "12.00", notes: null,
  createdAt: new Date("2026-01-01"),
};

function selections(...results: unknown[][]) {
  for (const rows of results) {
    fixtures.select.mockImplementationOnce(() => {
      const query = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(rows),
      };
      return query;
    });
  }
}

function patch(id: number | string = 42) {
  return request(app).patch(`/api/orders/${id}`).set("x-test-user", "user_fixture");
}

beforeEach(() => {
  fixtures.select.mockReset();
  fixtures.update.mockReset();
  fixtures.getUser.mockReset();
  fixtures.returning.mockReset().mockResolvedValue([order]);
  fixtures.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: fixtures.returning }),
    }),
  });
});

describe("PATCH /api/orders/:id authorization", () => {
  it("requires authentication before validating input or touching orders", async () => {
    const response = await request(app).patch("/api/orders/42").send({ status: "fulfilled" });
    expect(response.status).toBe(401);
    expect(fixtures.getUser).not.toHaveBeenCalled();
    expect(fixtures.select).not.toHaveBeenCalled();
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it.each([
    {}, { role: "buyer" }, { role: "unknown" }, { role: "farmer" },
    { role: "farmer", farmerId: "1" }, { role: "farmer", farmerId: 0 },
    { role: "farmer", farmerId: -1 }, { role: "farmer", farmerId: 1.5 },
  ])("denies missing or invalid management grants: %j", async (publicMetadata) => {
    fixtures.getUser.mockResolvedValue({ publicMetadata });
    const response = await patch().send({ status: "fulfilled", role: "admin", farmerId: 1 });
    expect(response.status).toBe(403);
    expect(fixtures.select).not.toHaveBeenCalled();
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it("does not accept roles from user-editable metadata or query strings", async () => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: {}, unsafeMetadata: { role: "admin" } });
    const response = await patch("42?role=admin&farmerId=1").send({ status: "fulfilled" });
    expect(response.status).toBe(403);
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ farmerId: 2 }],
    [{ farmerId: 1 }, { farmerId: 2 }],
    [{ farmerId: null }],
    [],
  ])("denies other-farm, mixed-farm, unresolved, or empty orders: %j", async (...items) => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "farmer", farmerId: 1 } });
    selections(items);
    const response = await patch().send({ status: "fulfilled" });
    expect(response.status).toBe(403);
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it("lets a farmer update an order belonging exclusively to their farm", async () => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "farmer", farmerId: 1 } });
    selections([{ farmerId: 1 }, { farmerId: 1 }], [order], []);
    const response = await patch().send({ status: "fulfilled" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 42, status: "fulfilled" });
    expect(fixtures.getUser).toHaveBeenCalledWith("user_fixture");
    expect(fixtures.update).toHaveBeenCalledOnce();
  });

  it("lets an administrator update any order without a farm assignment", async () => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "admin" } });
    selections([order], []);
    const response = await patch().send({ status: "fulfilled" });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("fulfilled");
    expect(fixtures.update).toHaveBeenCalledOnce();
  });

  it("returns 404 for an administrator updating a missing order", async () => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "admin" } });
    fixtures.returning.mockResolvedValue([]);
    expect((await patch().send({ status: "fulfilled" })).status).toBe(404);
  });

  it.each(["invalid", "0", "-1", "1.5"])("rejects invalid IDs: %s", async (id) => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "admin" } });
    expect((await patch(id).send({ status: "fulfilled" })).status).toBe(400);
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it.each([{}, { status: "" }, { status: 1 }])("rejects invalid status input: %j", async (body) => {
    fixtures.getUser.mockResolvedValue({ publicMetadata: { role: "admin" } });
    expect((await patch().send(body)).status).toBe(400);
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it("fails closed when permission lookup fails", async () => {
    fixtures.getUser.mockRejectedValue(new Error("Clerk unavailable"));
    expect((await patch().send({ status: "fulfilled" })).status).toBe(500);
    expect(fixtures.update).not.toHaveBeenCalled();
  });

  it("honors a revoked grant on the next request", async () => {
    fixtures.getUser.mockResolvedValueOnce({ publicMetadata: { role: "admin" } })
      .mockResolvedValueOnce({ publicMetadata: { role: "buyer" } });
    selections([order], []);
    expect((await patch().send({ status: "fulfilled" })).status).toBe(200);
    expect((await patch().send({ status: "fulfilled" })).status).toBe(403);
    expect(fixtures.update).toHaveBeenCalledOnce();
  });
});
