import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isCronSecretRequest } from "./cronAuth";
import type { Request } from "express";

function reqWith(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

describe("isCronSecretRequest", () => {
  const OLD = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123";
  });
  afterEach(() => {
    if (OLD === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = OLD;
  });

  it("accepts a matching Bearer token", () => {
    expect(isCronSecretRequest(reqWith({ authorization: "Bearer test-secret-123" }))).toBe(true);
  });

  it("accepts a matching x-cron-secret header", () => {
    expect(isCronSecretRequest(reqWith({ "x-cron-secret": "test-secret-123" }))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isCronSecretRequest(reqWith({ authorization: "Bearer wrong" }))).toBe(false);
    expect(isCronSecretRequest(reqWith({ "x-cron-secret": "wrong" }))).toBe(false);
  });

  it("rejects when no credential is sent", () => {
    expect(isCronSecretRequest(reqWith({}))).toBe(false);
  });

  it("rejects everything when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    expect(isCronSecretRequest(reqWith({ authorization: "Bearer test-secret-123" }))).toBe(false);
  });
});
