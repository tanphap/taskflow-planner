import { describe, expect, it } from "vitest";
import { normalizeHelpAssistantStoredMessages, normalizeSuggestedHelpViews, parseHelpAssistantHistory, serializeHelpAssistantHistory } from "./helpAssistantHistory";

describe("help assistant browser history", () => {
  it("keeps a bounded and display-safe browser-only history", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `Message ${index}\u0000` }));
    const result = normalizeHelpAssistantStoredMessages(messages);
    expect(result).toHaveLength(10);
    expect(result[0]?.content).toBe("Message 2");
    expect(result.every(message => !message.content.includes("\u0000"))).toBe(true);
  });

  it("validates the version and locale before restoring history", () => {
    const serialized = serializeHelpAssistantHistory("vi", [{ role: "assistant", content: "Mở Công việc", suggestedViews: ["tasks", "email", "profile"] }]);
    expect(parseHelpAssistantHistory(serialized, "vi")).toEqual([{ role: "assistant", content: "Mở Công việc", suggestedViews: ["tasks", "email"] }]);
    expect(parseHelpAssistantHistory(serialized, "en")).toEqual([]);
    expect(parseHelpAssistantHistory("{broken", "vi")).toEqual([]);
  });

  it("never turns arbitrary values into navigation targets", () => {
    expect(normalizeSuggestedHelpViews(["tasks", "https://unsafe.example", "email", "profile"])).toEqual(["tasks", "email"]);
  });
});
