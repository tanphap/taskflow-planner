import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "11111111-1111-1111-1111-111111111111",
    email: "sample@example.com",
    name: "Sample User",
    geminiModel: "gemini-3.5-flash-lite",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("reports success (Supabase sessions are cleared client-side)", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});
