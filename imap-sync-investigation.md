# IMAP Sync Investigation

## 2026-08-21

- Phiên My Browser đã đăng nhập mở được Quản trị email production cho hộp thư Webmail `ntphap@vnpt.vn`.
- Tài khoản đang ở trạng thái `CẦN KẾT NỐI LẠI`, có thông báo lỗi IMAP trước đó và tổng số thư đã đồng bộ là 0.
- Sau khi bấm Đồng bộ trong phiên thật, giao diện duy trì trạng thái `Đang đồng bộ…` thay vì hoàn tất nhanh. Điều này cho thấy thao tác FETCH có thể bị chậm hoặc bị máy chủ Webmail giữ chờ khi yêu cầu cả nội dung RFC822 của nhiều thư.
- Bản sửa tiếp theo sẽ giảm yêu cầu đồng bộ về metadata tiêu đề/cờ/thời điểm, không tải toàn bộ nguồn thư trong cùng một lô, và áp dụng timeout rõ ràng để tránh trạng thái chờ vô hạn.
