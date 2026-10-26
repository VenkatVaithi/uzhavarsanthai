// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClerkQueryClientCacheInvalidator } from "./clerk-query-cache-invalidator";

const clerk = vi.hoisted(() => ({
  listener: undefined as undefined | ((state: { user: { id: string } | null }) => void),
  unsubscribe: vi.fn(),
  addListener: vi.fn(),
}));
vi.mock("@clerk/react", () => ({
  useClerk: () => ({ addListener: clerk.addListener }),
}));

function emit(id: string | null) {
  act(() => clerk.listener?.({ user: id ? { id } : null }));
}

describe("Clerk session cache isolation", () => {
  beforeEach(() => {
    clerk.addListener.mockImplementation((listener: typeof clerk.listener) => {
      clerk.listener = listener;
      return clerk.unsubscribe;
    });
  });
  afterEach(() => {
    cleanup();
    clerk.listener = undefined;
  });

  it("keeps the initial user's data and preserves it across successful session refreshes", () => {
    const client = new QueryClient();
    client.setQueryData(["orders"], ["current user's order"]);
    const clear = vi.spyOn(client, "clear");
    render(<ClerkQueryClientCacheInvalidator queryClient={client} />);
    emit("buyer-a");
    emit("buyer-a");
    expect(clear).not.toHaveBeenCalled();
    expect(client.getQueryData(["orders"])).toEqual(["current user's order"]);
  });

  it.each(["sign-out", "unrecoverable session expiry"])("clears private query and mutation data on %s", () => {
    const client = new QueryClient();
    const clear = vi.spyOn(client, "clear");
    render(<ClerkQueryClientCacheInvalidator queryClient={client} />);
    emit("buyer-a");
    client.setQueryData(["orders"], ["private order"]);
    client.getMutationCache().build(client, { mutationKey: ["checkout"] });
    emit(null);
    expect(client.getQueryCache().getAll()).toEqual([]);
    expect(client.getMutationCache().getAll()).toEqual([]);
    emit(null);
    expect(clear).toHaveBeenCalledTimes(1);
    emit("buyer-a");
    expect(client.getQueryData(["orders"])).toBeUndefined();
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it("clears another account's data on account switch and on sign-in from signed-out state", () => {
    const client = new QueryClient();
    render(<ClerkQueryClientCacheInvalidator queryClient={client} />);
    emit(null);
    client.setQueryData(["orders"], ["anonymous cache"]);
    emit("buyer-a");
    expect(client.getQueryData(["orders"])).toBeUndefined();
    client.setQueryData(["orders"], ["buyer-a order"]);
    emit("buyer-b");
    expect(client.getQueryData(["orders"])).toBeUndefined();
  });

  it("removes the Clerk listener when unmounted without resubscribing on an ordinary render", () => {
    const client = new QueryClient();
    const view = render(<ClerkQueryClientCacheInvalidator queryClient={client} />);
    view.rerender(<ClerkQueryClientCacheInvalidator queryClient={client} />);
    expect(clerk.addListener).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(clerk.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
