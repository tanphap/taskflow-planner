import { describe, expect, it } from "vitest";
import { filterEmailInbox } from "./emailInboxFilters";

const messages = [
  { id: 1, subject: "Họp kế hoạch quý", senderName: "Mai", senderEmail: "mai@example.com", snippet: "Tài liệu đã sẵn sàng", isRead: false },
  { id: 2, subject: "Hóa đơn dịch vụ", senderName: "Nina", senderEmail: "billing@example.com", snippet: "Thanh toán tháng tám", isRead: true },
  { id: 3, subject: "Bản tin tuần", senderName: "Team", senderEmail: "news@example.com", snippet: "Điểm tin nội bộ", isRead: true },
];

describe("filterEmailInbox", () => {
  it("searches subject, sender and snippet without changing the server-scoped inbox", () => {
    expect(filterEmailInbox(messages, { searchQuery: "billing", focus: "all", summarizedMessageIds: new Set(), suggestedMessageIds: new Set() }).map(message => message.id)).toEqual([2]);
    expect(filterEmailInbox(messages, { searchQuery: "tài liệu", focus: "all", summarizedMessageIds: new Set(), suggestedMessageIds: new Set() }).map(message => message.id)).toEqual([1]);
  });

  it("filters unread messages and AI-related messages deterministically", () => {
    expect(filterEmailInbox(messages, { searchQuery: "", focus: "unread", summarizedMessageIds: new Set([2]), suggestedMessageIds: new Set([1]) }).map(message => message.id)).toEqual([1]);
    expect(filterEmailInbox(messages, { searchQuery: "", focus: "summarized", summarizedMessageIds: new Set([2]), suggestedMessageIds: new Set([1]) }).map(message => message.id)).toEqual([2]);
    expect(filterEmailInbox(messages, { searchQuery: "", focus: "suggested", summarizedMessageIds: new Set([2]), suggestedMessageIds: new Set([1]) }).map(message => message.id)).toEqual([1]);
  });
});
