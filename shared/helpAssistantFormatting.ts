/**
 * Repairs a small set of common inline numbered-step patterns before Markdown
 * rendering. The assistant prompt requests Markdown; this is a safe display
 * fallback for older saved answers and occasional model formatting drift.
 */
export function formatHelpAssistantMarkdown(content: string) {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/([.!?])\s+(\d{1,2})[.)]\s+(?=\S)/g, "$1\n\n$2. ")
    .replace(/(^|\n)\s*(\d{1,2})\)\s+(?=\S)/g, "$1$2. ")
    .trim();
}
