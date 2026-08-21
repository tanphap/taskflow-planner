import { describe, expect, it } from "vitest";
import { getEmailConnectionFeedback } from "./emailConnectionFeedback";

describe("getEmailConnectionFeedback", () => {
  it("asks for Gmail credentials before attempting a connection", () => {
    expect(getEmailConnectionFeedback({ provider: "google", configured: true, gmailEmail: "", gmailAppPassword: "" })).toBe("gmail-credentials-required");
  });

  it("explains missing server encryption configuration for Gmail", () => {
    expect(getEmailConnectionFeedback({ provider: "google", configured: false, gmailEmail: "person@gmail.com", gmailAppPassword: "app-password" })).toBe("gmail-server-configuration-required");
  });

  it("explains Microsoft OAuth configuration before redirecting", () => {
    expect(getEmailConnectionFeedback({ provider: "microsoft", configured: false })).toBe("microsoft-oauth-configuration-required");
    expect(getEmailConnectionFeedback({ provider: "microsoft", configured: true })).toBe("ready");
  });
});
