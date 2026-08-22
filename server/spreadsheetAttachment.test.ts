import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { extractHtmlTablesForGemini, extractTabularAttachmentForGemini, isTabularAttachment } from "./spreadsheetAttachment";

describe("spreadsheet attachment extraction", () => {
  it("converts a CSV attachment into bounded readable table text", () => {
    const table = extractTabularAttachmentForGemini({ filename: "tasks.csv", contentType: "text/csv", content: Buffer.from("Task,Owner,Due\nSend proposal,Lan,2026-08-30\n") });

    expect(table).toContain("Bảng đính kèm 1");
    expect(table).toContain("Task | Owner | Due");
    expect(table).toContain("Send proposal | Lan");
  });

  it("reads the first bounded sheets of an Excel attachment without retaining file bytes", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Hạng mục", "Người phụ trách"], ["Báo cáo", "Minh"]]), "Kế hoạch");
    const content = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const table = extractTabularAttachmentForGemini({ filename: "ke-hoach.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content });

    expect(table).toContain("Kế hoạch");
    expect(table).toContain("Hạng mục | Người phụ trách");
    expect(table).toContain("Báo cáo | Minh");
  });

  it("extracts readable rows from an HTML email table and recognizes spreadsheet extensions", () => {
    expect(extractHtmlTablesForGemini("<table><tr><th>Ngày</th><th>Việc</th></tr><tr><td>25/08</td><td>Gọi khách hàng</td></tr></table>")).toContain("25/08 | Gọi khách hàng");
    expect(isTabularAttachment("budget.XLSX", "application/octet-stream")).toBe(true);
  });
});
