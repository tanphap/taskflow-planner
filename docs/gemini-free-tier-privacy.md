# Gemini miễn phí và tóm tắt email opt-in

Ngày rà soát: 21-08-2026.

Gemini API có quota miễn phí cho một số mô hình, nhưng giới hạn thực tế được Google áp dụng theo dự án và thay đổi theo model, tier cũng như thời điểm. Google đo giới hạn bằng request/phút, token/phút và request/ngày; ứng dụng cần coi lỗi giới hạn là trạng thái có thể xảy ra và không tự động thử lại vô hạn. [1]

Với Gemini API quota miễn phí, Google nêu rằng nội dung gửi vào và nội dung sinh ra có thể được dùng để cải thiện sản phẩm; người đánh giá có thể xử lý đầu vào/đầu ra. Vì vậy, TaskFlow chỉ cho phép gửi **một email do người dùng chủ động chọn** sau khi họ đồng ý rõ ràng, không tự quét hay gửi toàn bộ inbox. [2]

Tóm tắt được lưu theo `userId` và `emailMessageId`. Người dùng có thể xem, tóm tắt lại hoặc xóa nội dung tóm tắt. Không gửi đính kèm, thông tin kết nối IMAP, token OAuth2 hay các thư không được người dùng chọn tới Gemini.

## Nguồn tham khảo

[1] [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

[2] [Gemini API Additional Terms of Service — Unpaid Services](https://ai.google.dev/gemini-api/terms)
