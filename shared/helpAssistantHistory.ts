export const HELP_ASSISTANT_VIEWS = ["dashboard", "tasks", "calendar", "notifications", "profile", "email"] as const;

export type HelpAssistantView = typeof HELP_ASSISTANT_VIEWS[number];
export type HelpAssistantLocale = "vi" | "en";
export type HelpAssistantStoredMessage = {
  role: "user" | "assistant";
  content: string;
  suggestedViews?: HelpAssistantView[];
};

const HELP_ASSISTANT_HISTORY_VERSION = 1;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARACTERS = 1_200;
const MAX_SUGGESTED_VIEWS = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isHelpAssistantView(value: unknown): value is HelpAssistantView {
  return typeof value === "string" && (HELP_ASSISTANT_VIEWS as readonly string[]).includes(value);
}

export function normalizeSuggestedHelpViews(value: unknown): HelpAssistantView[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<HelpAssistantView>();
  for (const candidate of value) {
    if (isHelpAssistantView(candidate)) unique.add(candidate);
    if (unique.size === MAX_SUGGESTED_VIEWS) break;
  }
  return Array.from(unique);
}

function normalizeContent(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, MAX_MESSAGE_CHARACTERS);
}

export function normalizeHelpAssistantStoredMessages(value: unknown): HelpAssistantStoredMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY_MESSAGES)
    .flatMap(candidate => {
      if (!isRecord(candidate) || (candidate.role !== "user" && candidate.role !== "assistant")) return [];
      const content = normalizeContent(candidate.content);
      if (!content) return [];
      const suggestedViews = candidate.role === "assistant" ? normalizeSuggestedHelpViews(candidate.suggestedViews) : [];
      return [{
        role: candidate.role,
        content,
        ...(suggestedViews.length ? { suggestedViews } : {}),
      }];
    });
}

export function parseHelpAssistantHistory(value: string | null, locale: HelpAssistantLocale): HelpAssistantStoredMessage[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== HELP_ASSISTANT_HISTORY_VERSION || parsed.locale !== locale) return [];
    return normalizeHelpAssistantStoredMessages(parsed.messages);
  } catch {
    return [];
  }
}

export function serializeHelpAssistantHistory(locale: HelpAssistantLocale, messages: HelpAssistantStoredMessage[]) {
  return JSON.stringify({
    version: HELP_ASSISTANT_HISTORY_VERSION,
    locale,
    messages: normalizeHelpAssistantStoredMessages(messages),
  });
}
