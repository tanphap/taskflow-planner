export type EmailInboxFocus = "all" | "unread" | "summarized" | "suggested";

export type SearchableEmailMessage = {
  id: number;
  subject: string;
  senderName?: string | null;
  senderEmail?: string | null;
  snippet?: string | null;
  isRead: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

/** Applies user-facing search and AI-focus filters after inbox data has been scoped by the server. */
export function filterEmailInbox<T extends SearchableEmailMessage>(
  messages: T[],
  input: {
    searchQuery: string;
    focus: EmailInboxFocus;
    summarizedMessageIds: ReadonlySet<number>;
    suggestedMessageIds: ReadonlySet<number>;
  },
) {
  const query = normalize(input.searchQuery);

  return messages.filter(message => {
    const matchesQuery = !query || [message.subject, message.senderName, message.senderEmail, message.snippet]
      .some(value => normalize(value).includes(query));
    if (!matchesQuery) return false;

    if (input.focus === "unread") return !message.isRead;
    if (input.focus === "summarized") return input.summarizedMessageIds.has(message.id);
    if (input.focus === "suggested") return input.suggestedMessageIds.has(message.id);
    return true;
  });
}
