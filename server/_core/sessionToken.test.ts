import { describe, expect, it } from "vitest";
import { getRequestSessionToken } from "./sessionToken";

describe("getRequestSessionToken", () => {
  it("always returns empty: Manus sessions no longer exist, human sign-in uses Supabase Auth", () => {
    expect(getRequestSessionToken({ cookie: "app_session_id=cookie-session" })).toBe("");
    expect(getRequestSessionToken({ authorization: "******" })).toBe("");
    expect(getRequestSessionToken({})).toBe("");
  });
});
