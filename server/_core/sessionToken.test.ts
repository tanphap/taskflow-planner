import { describe, expect, it } from "vitest";
import { getRequestSessionToken } from "./sessionToken";

describe("getRequestSessionToken", () => {
  it("uses the OAuth session cookie when present", () => {
    expect(getRequestSessionToken({ cookie: "app_session_id=cookie-session" })).toBe("cookie-session");
  });

  it("uses a Bearer session when the browser does not send the cookie", () => {
    expect(getRequestSessionToken({ authorization: "Bearer bearer-session" })).toBe("bearer-session");
  });

  it("does not accept a non-Bearer authorization value", () => {
    expect(getRequestSessionToken({ authorization: "Basic abc" })).toBe("");
  });
});
