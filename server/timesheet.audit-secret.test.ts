import { describe, expect, it } from "vitest";

describe("timesheet audit authorization configuration", () => {
  it("is available to the server without exposing its value", async () => {
    const auditAuth = process.env.TIMESHEET_DATABASE_AUDIT_AUTH;
    expect(auditAuth).toBeDefined();

    const response = await fetch("http://127.0.0.1:3000/api/oauth/callback", {
      headers: { Authorization: `Bearer ${auditAuth ?? ""}` },
    });

    expect(response.status).toBeLessThan(500);
  });
});

export {};

// This test only validates configuration loading and endpoint reachability.
// It never logs or asserts the secret's actual value.

// vitest keeps this file server-side; no browser bundle receives the variable.

// The endpoint is intentionally a lightweight unauthenticated callback probe.

// No data mutation is performed.

// End.
