import { describe, expect, it } from "vitest";
import { getEmailConnectionFeedback } from "./emailConnectionFeedback";

describe("getEmailConnectionFeedback", () => {
  it("asks for Gmail credentials before attempting a connection", () => {
    expect(getEmailConnectionFeedback({ provider: "google", configured: true, email: "", password: "" })).toBe("gmail-credentials-required");
  });

  it("explains missing server encryption configuration for Gmail", () => {
    expect(getEmailConnectionFeedback({ provider: "google", configured: false, email: "person@gmail.com", password: "app-password" })).toBe("gmail-server-configuration-required");
  });

  it("requires the server, credentials and a ready encryption configuration for Webmail", () => {
    expect(getEmailConnectionFeedback({ provider: "webmail", configured: true, email: "person@vnpt.vn", password: "mail-password" })).toBe("webmail-credentials-required");
    expect(getEmailConnectionFeedback({ provider: "webmail", configured: false, email: "person@vnpt.vn", password: "mail-password", imapHost: "email.vnpt.vn" })).toBe("webmail-server-configuration-required");
    expect(getEmailConnectionFeedback({ provider: "webmail", configured: true, email: "person@vnpt.vn", password: "mail-password", imapHost: "email.vnpt.vn" })).toBe("ready");
  });
});
