# Kiểm chứng Gemini miễn phí — tóm tắt email theo yêu cầu

## Phạm vi kiểm tra

Trong phiên **My Browser** đã xác thực, mục **Quản trị email** tải thành công với khu vực `GEMINI / OPT-IN` ở phần Inbox. Khu vực này nêu rõ chỉ tiêu đề, người gửi và phần xem trước của thư Gmail mà người dùng chủ động bấm tóm tắt mới được gửi tới Gemini; ứng dụng không tự quét toàn bộ inbox và giới hạn 10 lượt tóm tắt mới mỗi ngày.

Phiên kiểm chứng không có hộp Gmail hay thư nào được kết nối. Vì vậy, không có nội dung email thật nào được gửi tới Gemini và không tạo dữ liệu kiểm chứng.

## Kết quả kỹ thuật

| Hạng mục | Kết quả |
| --- | --- |
| Kiểm tra kiểu dữ liệu | `pnpm check` thành công |
| Production build | Thành công; chỉ có cảnh báo chunk frontend lớn hơn 500 kB, không chặn triển khai |
| Vitest | 40 kiểm thử đều đạt |
| Kiểm thử Gemini | Bao gồm kiểm tra API key, prompt coi dữ liệu email là không đáng tin cậy, chuẩn hóa giới hạn tóm tắt và mock lời gọi chỉ dùng dữ liệu xem trước của thư được chọn |

> Cần kiểm chứng đầu-cuối nút **Tóm tắt bằng Gemini** sau khi người dùng kết nối Gmail IMAP thực tế. Chế độ Gemini miễn phí chỉ được sử dụng sau thao tác và đồng ý rõ ràng của người dùng.
