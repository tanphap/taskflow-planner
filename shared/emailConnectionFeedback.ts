export type EmailConnectionProvider = "google" | "microsoft";

export type EmailConnectionFeedback =
  | "ready"
  | "gmail-credentials-required"
  | "gmail-server-configuration-required"
  | "microsoft-oauth-configuration-required";

export function getEmailConnectionFeedback(input: {
  provider: EmailConnectionProvider;
  configured: boolean;
  gmailEmail?: string;
  gmailAppPassword?: string;
}): EmailConnectionFeedback {
  if (input.provider === "google") {
    if (!input.gmailEmail?.trim() || !input.gmailAppPassword?.trim()) return "gmail-credentials-required";
    return input.configured ? "ready" : "gmail-server-configuration-required";
  }

  return input.configured ? "ready" : "microsoft-oauth-configuration-required";
}
