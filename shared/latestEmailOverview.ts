export type LatestEmailOverviewMessage = {
  id: number;
  subject: string;
  senderName: string | null;
  receivedAt: Date | string;
};

export type LatestEmailOverviewSummary = {
  emailMessageId: number;
  summary: string;
  generatedAt: Date | string;
};

export type LatestEmailOverviewItem = LatestEmailOverviewMessage & {
  savedSummary: LatestEmailOverviewSummary | null;
};

export function getLatestEmailOverviewItems(
  messages: readonly LatestEmailOverviewMessage[],
  summaries: readonly LatestEmailOverviewSummary[],
  limit = 3,
): LatestEmailOverviewItem[] {
  const summariesByMessage = new Map<number, LatestEmailOverviewSummary>();
  for (const summary of summaries) {
    const existing = summariesByMessage.get(summary.emailMessageId);
    if (!existing || new Date(summary.generatedAt).getTime() > new Date(existing.generatedAt).getTime()) {
      summariesByMessage.set(summary.emailMessageId, summary);
    }
  }

  return [...messages]
    .sort((left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime())
    .slice(0, Math.max(1, limit))
    .map(message => ({ ...message, savedSummary: summariesByMessage.get(message.id) ?? null }));
}
