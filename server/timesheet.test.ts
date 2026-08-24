import { describe, expect, it } from "vitest";
import { aggregateTimesheet, listTimesheetPeople, parseCsv } from "./timesheet";

const header = ["TT", "Nhóm công việc", "Thư viện công việc", "Nội dung chi tiết công việc (Nêu rõ chi tiết công việc) ", "Loại công việc", "Hệ thống tb", "Thiết bị ảnh hưởng", "Hệ thống CQ", "Tuyến/Hướng", "Loại cáp", "Đài", "Người Thực hiện", "Nhân sự phối hợp", "Ngày bắt đầu", "Giờ bắt đầu", "Ngày kết thúc", "Giờ kết thúc"];
function csvRow(values: string[]) { return values.map(value => /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(","); }

describe("timesheet aggregation", () => {
  it("parses quoted CSV fields", () => {
    expect(parseCsv('a,"b,c","d""e"\n')).toEqual([["a", "b,c", 'd"e']]);
  });

  it("filters the exact selected name, handles overnight work and aggregates month/year", () => {
    const csv = [
      csvRow(header),
      csvRow(["1", "Vận hành", "TNOC, Core", "Theo dõi", "Theo ca", "", "", "", "", "", "", "Nguyễn Tấn Pháp", "", "03/07/2026", "22:00", "04/07/2026", "02:00"]),
      csvRow(["2", "Vận hành", "TNOC, Core", "Kiểm tra", "Theo ca", "", "", "", "", "", "", "", "Pháp", "04/07/2026", "08.00", "04/07/2026", "12.30"]),
      csvRow(["3", "Khác", "Ứng dụng", "Không thuộc nhân sự", "", "", "", "", "", "", "", "Người khác", "", "04/07/2026", "08:00", "04/07/2026", "09:00"]),
      csvRow(["4", "Vận hành", "Ứng dụng", "Tháng khác", "", "", "", "", "", "", "", "Pháp", "", "01/08/2026", "08:00", "01/08/2026", "10:00"]),
    ].join("\n");

    const result = aggregateTimesheet(csv, { month: 7, year: 2026, employeeMatch: "Nguyễn Tấn Pháp" });

    expect(result.summary).toEqual({ workDays: 1, totalHours: 4, workUnits: 0.5, taskCount: 1 });
    expect(result.byLibrary).toEqual([{ name: "TNOC, Core", hours: 4, taskCount: 1 }]);
    expect(result.byDay).toEqual([{ date: "03/07/2026", day: 3, hours: 4, taskCount: 1 }]);
    expect(result.yearTrend[7]).toEqual({ month: 8, hours: 0, taskCount: 0, workDays: 0 });
    expect(result.report.sent).toBe(false);
  });

  it("lists distinct full names and aggregates only the exact selected person", () => {
    const csv = [
      csvRow(header),
      csvRow(["1", "Vận hành", "Core", "Ca sáng", "", "", "", "", "", "", "", "Nguyễn Tấn", "Pháp", "05/07/2026", "08:00", "05/07/2026", "12:00"]),
      csvRow(["2", "Vận hành", "Core", "Ca chiều", "", "", "", "", "", "", "", "Nguyễn Tấn", "Pháp", "05/07/2026", "13:00", "05/07/2026", "17:00"]),
      csvRow(["3", "Khác", "Ứng dụng", "Ca khác", "", "", "", "", "", "", "", "Nguyễn Tấn", "Pháp Anh", "05/07/2026", "08:00", "05/07/2026", "17:00"]),
    ].join("\n");
    expect(listTimesheetPeople(csv)).toEqual([{ name: "Nguyễn Tấn" }, { name: "Pháp" }, { name: "Pháp Anh" }]);
    expect(aggregateTimesheet(csv, { month: 7, year: 2026, employeeMatch: "Pháp" }).summary.totalHours).toBe(8);
  });
});
