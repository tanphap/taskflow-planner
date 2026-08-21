export type EmailConnectionProvider = "google" | "webmail";

export type EmailConnectionFeedback =
  | "ready"
  | "gmail-credentials-required"
  | "gmail-server-configuration-required"
  | "webmail-credentials-required"
  | "webmail-server-configuration-required";

export function getEmailConnectionFeedback(input: {
  provider: EmailConnectionProvider;
  configured: boolean;
  email?: string;
  password?: string;
  imapHost?: string;
}): EmailConnectionFeedback {
  if (input.provider === "google") {
    if (!input.email?.trim() || !input.password?.trim()) return "gmail-credentials-required";
    return input.configured ? "ready" : "gmail-server-configuration-required";
  }

  if (!input.email?.trim() || !input.password?.trim() || !input.imapHost?.trim()) return "webmail-credentials-required";
  return input.configured ? "ready" : "webmail-server-configuration-required";
}
