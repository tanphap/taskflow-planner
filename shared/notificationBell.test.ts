import { describe, expect, it } from "vitest";
import { getNotificationBellData } from "./notificationBell";

describe("getNotificationBellData", () => {
  it("chỉ kích hoạt chuông từ email mới và nhắc việc chưa đọc", () => {
    const result = getNotificationBellData(
      [{ id: 1, status: "new" }, { id: 2, status: "done" }, { id: 3, status: "archived" }],
      [{ id: 7, title: "Họp đội" }, { id: 8, title: "Gửi báo cáo" }],
    );

    expect(result.newEmails.map(email => email.id)).toEqual([1]);
    expect(result.dueNotifications).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it("không hiển thị badge khi không còn email mới hoặc nhắc việc", () => {
    const result = getNotificationBellData([{ status: "done" }], []);

    expect(result.newEmails).toEqual([]);
    expect(result.total).toBe(0);
  });
});
