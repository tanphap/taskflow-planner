import { describe, expect, it } from "vitest";
import { matchesTimesheetAccountSearch, normalizeTimesheetAccountSearch } from "./timesheetAccountSearch";

describe("timesheet account search", () => {
  it("normalizes Vietnamese accents and the đ character", () => {
    expect(normalizeTimesheetAccountSearch("  Nguyễn Đình Hào  ")).toBe("nguyen dinh hao");
  });

  it("finds an account by display name or email without case or accent sensitivity", () => {
    const account = { name: "Nguyễn Đình Hào", email: "hao.nguyen@example.com" };
    expect(matchesTimesheetAccountSearch(account, "nguyen dinh")).toBe(true);
    expect(matchesTimesheetAccountSearch(account, "HAO.NGUYEN")).toBe(true);
    expect(matchesTimesheetAccountSearch(account, "minh")).toBe(false);
  });
});
