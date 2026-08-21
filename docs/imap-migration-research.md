# Ghi nhận nghiên cứu chuyển đổi IMAP

Ngày rà soát: 21-08-2026.

## Mục tiêu

TaskFlow sẽ thay thế trải nghiệm kết nối Gmail/Outlook riêng theo OAuth bằng cấu hình hộp thư IMAP do người dùng nhập. Hệ thống chỉ đồng bộ thư đến, sau đó chuyển metadata đã lưu vào quy trình AI đề xuất lịch hẹn. Secret IMAP vẫn phải được mã hóa AES-256-GCM phía máy chủ, không trả về API hay hiển thị lại ở giao diện.

## Phát hiện từ nhà cung cấp

| Nhà cung cấp | Thiết lập IMAP | Lưu ý bắt buộc |
| --- | --- | --- |
| Gmail / Google Workspace | Hỗ trợ IMAP; thông số phổ biến là `imap.gmail.com`, cổng `993`, TLS. | Tài khoản hoặc quản trị viên có thể phải bật IMAP. Chế độ xác thực phụ thuộc chính sách tài khoản; cần hướng dẫn người dùng dùng mật khẩu ứng dụng khi được nhà cung cấp cho phép. |
| Outlook.com | `outlook.office365.com`, cổng `993`, SSL/TLS. | Tài liệu Microsoft nêu IMAP/POP tắt mặc định và yêu cầu bật trong Settings → Mail → Forwarding and IMAP; đối với Outlook.com, Modern Auth/OAuth2 là phương thức xác thực được yêu cầu. |
| Hộp thư khác | Người dùng tự nhập hostname, cổng và TLS. | TaskFlow không tự giả định máy chủ hoặc chính sách xác thực; xác minh kết nối trước khi lưu thông tin tài khoản. |

## Hệ quả thiết kế

1. Giao diện phải gọi đây là **kết nối IMAP**, không hứa mọi Gmail/Outlook đều dùng được chỉ với mật khẩu. Mỗi tài khoản cần nêu rõ IMAP có thể bị chính sách tổ chức chặn hoặc cần mật khẩu ứng dụng/OAuth2.
2. Cần hỗ trợ cấu hình IMAP tổng quát. Với Outlook.com hiện đại, kết nối IMAP dùng username/password truyền thống không thể thay thế OAuth2 nếu Microsoft bắt buộc Modern Auth.
3. Chỉ mở TLS mặc định, xác thực hostname chứng thư, giới hạn kích thước/ký tự metadata đồng bộ và không đưa nội dung email hay secret vào log.
4. Hệ thống tiếp tục tạo đề xuất AI; không tự tạo lịch hẹn hoặc nhắc Telegram khi chưa có xác nhận của người dùng.

## Nguồn

- Google: https://support.google.com/mail/answer/78892?hl=en
- Google Workspace Developers: https://developers.google.com/workspace/gmail/imap/imap-smtp
- Microsoft Support: https://support.microsoft.com/en-US/Outlook/pop-imap-and-smtp-settings-for-outlook-com
