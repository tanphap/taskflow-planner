# Nghiên cứu luồng Email → AI → Lịch hẹn

Ngày rà soát: 21/08/2026.

## Nền tảng nhận thư mới

Gmail hỗ trợ thông báo đẩy thông qua Google Cloud Pub/Sub. Hệ thống cần gọi `users.watch`, duy trì `historyId`, xử lý dữ liệu thông báo được mã hóa Base64URL và gọi `history.list` để lấy thay đổi. Quyền theo dõi phải được gia hạn ít nhất mỗi 7 ngày; Google khuyến nghị gia hạn hằng ngày. Vì thông báo có thể bị trì hoãn hoặc mất, Google yêu cầu vẫn có cơ chế đồng bộ dự phòng định kỳ.

Microsoft Graph hỗ trợ webhook cho thay đổi của thư mục Inbox. Endpoint phải dùng HTTPS công khai, phản hồi xác thực `validationToken` dạng văn bản thuần trong vòng 10 giây khi tạo subscription, rồi phản hồi thông báo trong vòng 3 giây (200/202 nếu đã xếp hàng). Mỗi subscription phải gia hạn trước khi hết hạn; `clientState` bí mật được dùng để xác thực nguồn thông báo.

## Quyết định thiết kế tạm thời

Phiên bản ban đầu nên đồng bộ theo lịch đã bật/tắt được trong ứng dụng, sau đó chạy AI cho các thư mới và chỉ lưu **đề xuất**. Người dùng xem nguồn thư, chỉnh sửa thời gian/nhắc, rồi bấm xác nhận để tạo lịch hẹn. Không tự tạo lịch hẹn, gửi Telegram hoặc ghi thay đổi vào hộp thư chỉ vì AI dự đoán.

Webhook Gmail qua Pub/Sub và Microsoft Graph là phương án phản hồi nhanh hơn cho giai đoạn mở rộng, nhưng yêu cầu hạ tầng Google Cloud/Microsoft Graph bổ sung, xử lý gia hạn và xác thực callback. Nó không là điều kiện để ra mắt tính năng nhận diện đề xuất theo lịch.

## AI

Danh mục mô hình đang hoạt động được kiểm tra qua endpoint dự án vào 21/08/2026 và có `gpt-5-mini`. Thiết kế mặc định dự kiến dùng mô hình này với JSON Schema bắt buộc cho tác vụ trích xuất tiêu đề, thời gian, liên kết kế hoạch, mức tin cậy và lý do nhận diện. Thư có dữ liệu thời gian không rõ ràng hoặc mức tin cậy thấp sẽ không được đưa vào luồng tạo lịch.

## Nguồn chính thức

1. Google for Developers, “Configure push notifications in Gmail API” — https://developers.google.com/workspace/gmail/api/guides/push
2. Microsoft Learn, “Receive change notifications through webhooks” — https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks
3. Microsoft Learn, “Microsoft Graph change notifications API overview” — https://learn.microsoft.com/en-us/graph/api/resources/change-notifications-api-overview?view=graph-rest-1.0
