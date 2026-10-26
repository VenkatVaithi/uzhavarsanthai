import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express, RequestHandler } from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CLERK_PROXY_PATH } from "./clerkProxyMiddleware";

const proxy = vi.hoisted(() => ({ target: "" }));

// Keep the real HTTP proxy, request hooks, and response streaming. Only replace
// the remote destination so tests never contact Clerk or use real credentials.
vi.mock("http-proxy-middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("http-proxy-middleware")>();
  return {
    ...actual,
    createProxyMiddleware: (options: Parameters<typeof actual.createProxyMiddleware>[0]) =>
      actual.createProxyMiddleware({ ...options, target: proxy.target }),
  };
});

// These tests exercise the production app's proxy mount and retired routes, not
// Clerk token validation or the database-backed local-user bridge.
vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => ((_req, _res, next) => next()) satisfies RequestHandler,
  getAuth: vi.fn(),
}));
vi.mock("@workspace/db", async () => ({
  ...await import("../../../../lib/db/src/schema"),
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("pino-http", () => ({
  default: () => ((_req, _res, next) => next()) satisfies RequestHandler,
}));

interface Reply {
  status: number;
  body: string;
  headers?: Record<string, string | string[]>;
  withLength?: boolean;
}

interface ForwardedRequest {
  path: string | undefined;
  method: string | undefined;
  ip: string | string[] | undefined;
  body: string;
  proxyUrl: string | string[] | undefined;
}

describe("Clerk abuse-protection proxy boundary", () => {
  let upstream: Server;
  let app: Express;
  const replies: Reply[] = [];
  const forwarded: ForwardedRequest[] = [];

  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_proxy_fixture_not_a_real_key");
    upstream = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        forwarded.push({
          path: req.url,
          method: req.method,
          ip: req.headers["x-forwarded-for"],
          body: Buffer.concat(chunks).toString(),
          proxyUrl: req.headers["clerk-proxy-url"],
        });
        const reply = replies.shift();
        if (!reply) {
          res.writeHead(500).end("Unexpected upstream request");
          return;
        }
        res.writeHead(reply.status, {
          "content-type": "application/json",
          ...reply.headers,
          ...(reply.withLength
            ? { "content-length": String(Buffer.byteLength(reply.body)) }
            : {}),
        });
        res.end(reply.body);
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    proxy.target = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
    // Import after setting the fixture environment: the app creates the proxy
    // once at startup, before express.json() can consume sign-in request bodies.
    app = (await import("../app")).default;
  });

  beforeEach(() => {
    replies.length = 0;
    forwarded.length = 0;
  });

  afterEach(() => {
    expect(replies).toHaveLength(0);
  });

  afterAll(async () => {
    try {
      if (upstream) {
        await new Promise<void>((resolve, reject) =>
          upstream.close((error) => error ? reject(error) : resolve()),
        );
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([
    ["/v1/client/sign_ins", false],
    ["/v1/client/sign_ins", true],
    ["/v1/client/sign_ups", false],
    ["/v1/client/sign_ups", true],
  ] as const)("preserves Clerk 429 and retry instructions for %s (length-known: %s)", async (path, withLength) => {
    const body = JSON.stringify({
      errors: [{ code: "too_many_requests", message: "Too many requests. Please try again later." }],
    });
    replies.push({
      status: 429,
      body,
      withLength,
      headers: { "retry-after": "60", "cache-control": "no-store" },
    });

    const response = await request(app)
      .post(`${CLERK_PROXY_PATH}${path}`)
      .set("x-forwarded-for", "192.0.2.10")
      .send({ identifier: "buyer@example.test", password: "invalid-test-password" });

    expect(response.status).toBe(429);
    expect(response.text).toBe(body);
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-length"]).toBe(String(Buffer.byteLength(body)));
    expect(response.headers["transfer-encoding"]).toBeUndefined();
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]).toMatchObject({ method: "POST", path });
  });

  it.each(["/v1/client/sign_ins", "/v1/client/sign_ups"])(
    "allows the next request when Clerk lifts the limit for %s",
    async (path) => {
      replies.push(
        { status: 429, body: '{"errors":[{"code":"too_many_requests"}]}', headers: { "retry-after": "1" } },
        { status: 200, body: '{"response":{"status":"complete"}}', headers: { "set-cookie": ["__session=fixture; HttpOnly; Secure; Path=/"] } },
      );
      const send = () => request(app).post(`${CLERK_PROXY_PATH}${path}`)
        .set("x-forwarded-for", "192.0.2.10")
        .send({ identifier: "buyer@example.test" });

      expect((await send()).status).toBe(429);
      // No fake timer/threshold here: Clerk owns the reset clock. The app must
      // consult it again, rather than cache 429 or maintain a second lockout.
      const recovered = await send();
      expect(recovered.status).toBe(200);
      expect(recovered.body).toEqual({ response: { status: "complete" } });
      expect(recovered.headers["retry-after"]).toBeUndefined();
      expect(recovered.headers["set-cookie"]).toEqual(["__session=fixture; HttpOnly; Secure; Path=/"]);
      expect(forwarded).toHaveLength(2);
    },
  );

  it("keeps account identities and client IPs independent across requests", async () => {
    const attempts = [
      { account: "limited@example.test", ip: "192.0.2.10", status: 429 },
      { account: "other@example.test", ip: "192.0.2.10", status: 200 },
      { account: "limited@example.test", ip: "198.51.100.20", status: 200 },
    ];
    for (const attempt of attempts) {
      replies.push({ status: attempt.status, body: JSON.stringify({ status: attempt.status }) });
      const response = await request(app)
        .post(`${CLERK_PROXY_PATH}/v1/client/sign_ins?__clerk_api_version=2025-04-10`)
        .set("x-forwarded-for", `${attempt.ip}, 203.0.113.1`)
        .set("x-forwarded-host", "market.example.test")
        .set("x-forwarded-proto", "https")
        .type("form")
        .send({ identifier: attempt.account, password: "fixture-password" });
      expect(response.status).toBe(attempt.status);
    }

    expect(forwarded).toHaveLength(attempts.length);
    forwarded.forEach((req, index) => {
      expect(req.ip).toBe(attempts[index].ip);
      expect(new URLSearchParams(req.body).get("identifier")).toBe(attempts[index].account);
      expect(new URLSearchParams(req.body).get("password")).toBe("fixture-password");
      expect(req.path).toBe("/v1/client/sign_ins?__clerk_api_version=2025-04-10");
      expect(req.proxyUrl).toBe(`https://market.example.test${CLERK_PROXY_PATH}`);
    });
  });

  it("forwards invalid-login responses and a later success without a local lockout", async () => {
    const invalid = '{"errors":[{"code":"form_password_incorrect","message":"Password is incorrect."}]}';
    replies.push(
      ...Array.from({ length: 12 }, () => ({ status: 422, body: invalid })),
      { status: 200, body: '{"response":{"status":"complete"}}' },
      { status: 422, body: invalid },
    );
    for (let index = 0; index < 14; index++) {
      const response = await request(app).post(`${CLERK_PROXY_PATH}/v1/client/sign_ins`)
        .send({ identifier: "buyer@example.test", password: "fixture-password" });
      expect(response.status).toBe(index === 12 ? 200 : 422);
      if (index !== 12) expect(response.text).toBe(invalid);
    }
    expect(forwarded).toHaveLength(14);
  });

  it.each(["/api/auth/login", "/api/auth/register"])(
    "does not expose the retired local credential endpoint %s",
    async (path) => {
      const { db } = await import("@workspace/db");
      const response = await request(app).post(path)
        .send({ email: "buyer@example.test", password: "fixture-password" });
      expect(response.status).toBe(404);
      expect(forwarded).toHaveLength(0);
      expect(db.select).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    },
  );

  it("relays a completed provider sign-in cookie without manufacturing a local session", async () => {
    const body = '{"response":{"status":"complete","created_session_id":"sess_fixture"}}';
    replies.push({
      status: 200, body,
      headers: { "set-cookie": ["__session=fixture; HttpOnly; Secure; SameSite=Lax; Path=/"] },
    });
    const response = await request(app).post(`${CLERK_PROXY_PATH}/v1/client/sign_ins`)
      .send({ identifier: "buyer@example.test", password: "fixture-password" });
    expect(response.status).toBe(200);
    expect(response.text).toBe(body);
    expect(response.headers["set-cookie"]).toEqual([
      "__session=fixture; HttpOnly; Secure; SameSite=Lax; Path=/",
    ]);
    expect(forwarded).toHaveLength(1);
  });

  it("relays an existing-account collision without changing its safe provider error", async () => {
    const body = '{"errors":[{"code":"form_identifier_exists","message":"This account already exists."}]}';
    replies.push({ status: 422, body });
    const response = await request(app).post(`${CLERK_PROXY_PATH}/v1/client/sign_ups`)
      .send({ email_address: "existing@example.test" });
    expect(response.status).toBe(422);
    expect(response.text).toBe(body);
    expect(response.headers.location).toBeUndefined();
    expect(forwarded[0]).toMatchObject({ method: "POST", path: "/v1/client/sign_ups" });
  });

  it("relays session renewal and failed renewal without inventing a replacement cookie", async () => {
    const renewed = '{"response":{"status":"active"}}';
    const expired = '{"errors":[{"code":"session_expired"}]}';
    replies.push(
      { status: 200, body: renewed, headers: { "set-cookie": ["__session=renewed; HttpOnly; Secure; Path=/"] } },
      { status: 401, body: expired },
    );
    const path = `${CLERK_PROXY_PATH}/v1/client/sessions/sess_fixture/tokens`;
    const response = await request(app).post(path).send({});
    expect(response.status).toBe(200);
    expect(response.text).toBe(renewed);
    expect(response.headers["set-cookie"]).toEqual(["__session=renewed; HttpOnly; Secure; Path=/"]);
    const failure = await request(app).post(path).send({});
    expect(failure.status).toBe(401);
    expect(failure.text).toBe(expired);
    expect(failure.headers["set-cookie"]).toBeUndefined();
    expect(forwarded.map(({ path }) => path)).toEqual([
      "/v1/client/sessions/sess_fixture/tokens",
      "/v1/client/sessions/sess_fixture/tokens",
    ]);
  });

  it("relays sign-out cookie removal and does not expose the retired OIDC logout route", async () => {
    replies.push({
      status: 200, body: '{"response":{"status":"ended"}}',
      headers: { "set-cookie": ["__session=; Max-Age=0; HttpOnly; Secure; Path=/"] },
    });
    const response = await request(app).post(`${CLERK_PROXY_PATH}/v1/client/sessions/sess_fixture/remove`)
      .send({});
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toEqual([
      "__session=; Max-Age=0; HttpOnly; Secure; Path=/",
    ]);
    expect(forwarded[0]).toMatchObject({
      method: "POST", path: "/v1/client/sessions/sess_fixture/remove",
    });
    for (const path of ["/api/logout", "/api/callback"]) {
      const retired = await request(app).get(path);
      expect(retired.status).toBe(404);
    }
    expect(forwarded).toHaveLength(1);
  });
});
