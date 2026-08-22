/** Returns true only for the email whose Gemini summary request is currently pending. */
export function isEmailGeminiSummarizing(messageId: number, pendingMessageId: number | null | undefined): boolean {
  return pendingMessageId === messageId;
}
