import { describe, expect, it } from "vitest";
import { formatHelpAssistantMarkdown } from "./helpAssistantFormatting";

describe("formatHelpAssistantMarkdown", () => {
  it("moves packed numbered steps onto their own Markdown paragraphs", () => {
    expect(formatHelpAssistantMarkdown("Mở Công việc. 2) Chọn Tạo công việc. 3) Nhập tiêu đề.")).toBe(
      "Mở Công việc.\n\n2. Chọn Tạo công việc.\n\n3. Nhập tiêu đề."
    );
  });

  it("normalizes an opening parenthesized list marker without altering normal newlines", () => {
    expect(formatHelpAssistantMarkdown("1) Mở Công việc\n2) Chọn Tạo công việc")).toBe(
      "1. Mở Công việc\n2. Chọn Tạo công việc"
    );
  });
});
