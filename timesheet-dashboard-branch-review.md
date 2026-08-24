# Đánh giá nhánh `feature/timesheet-dashboard`

**Người soạn:** Manus AI  
**Thời điểm rà soát:** 24/08/2026  
**Phạm vi:** Đánh giá mã nguồn trên nhánh Timesheet Dashboard, chưa hợp nhất hoặc triển khai vào production.

## Kết luận

Nhánh Timesheet Dashboard là một bổ sung có cấu trúc tốt cho TaskFlow: nó đưa vào một màn hình chấm công theo tháng, tổng hợp giờ làm, ngày công, số việc, biểu đồ theo ngày/năm và phân bổ theo thư viện công việc. Nhánh này nằm trực tiếp trên checkpoint production hiện tại `8c27f06d`, chỉ có một commit mới `6c6f49e`; kiểm tra hợp nhất tĩnh không phát hiện xung đột hoặc lỗi khoảng trắng. [1]

Tuy vậy, **không nên hợp nhất nguyên trạng**. Phần lấy dữ liệu hiện mặc định đọc một Google Sheets đã xuất bản công khai, lọc bằng chuỗi tên mặc định `Pháp`, và mọi người dùng đã đăng nhập đều có thể gọi endpoint chấm công. Cách này chưa phù hợp với nguyên tắc tách dữ liệu theo tài khoản của TaskFlow.

| Hạng mục | Trạng thái nhánh | Đánh giá |
|---|---:|---|
| Quan hệ với production | 1 commit đi trước, cùng nền `8c27f06d` | Có thể tích hợp kỹ thuật, không có xung đột tĩnh |
| Thay đổi mã | 6 tệp, khoảng 301 dòng thêm | Phạm vi rõ ràng, không có migration DB |
| Tính năng hiển thị | KPI, 2 biểu đồ, 2 bảng, chọn tháng/năm | Phù hợp phong cách dashboard của TaskFlow |
| Dữ liệu nguồn | CSV từ Google Sheets, tối đa 5 MB, timeout 15 giây | Cần cấu hình nguồn riêng tư hơn và cơ chế cache |
| Phân quyền | `protectedProcedure` nhưng dùng cùng một nguồn/toàn bộ dữ liệu | Cần bổ sung ràng buộc theo tài khoản hoặc giới hạn owner |
| Song ngữ | Menu có thêm nhãn tiếng Anh; component còn nhiều chuỗi tiếng Việt cố định | Cần hoàn thiện trước khi phát hành |
| Lưu trạng thái báo cáo | Đọc JSON từ file cục bộ | Không phù hợp production Autoscale; thay bằng DB hoặc S3 |

## Nội dung nhánh hiện có

Nhánh bổ sung dịch vụ `server/timesheet.ts` để tải và phân tích CSV theo cấu trúc bảng chấm công gồm ngày/giờ bắt đầu-kết thúc, thư viện công việc và người thực hiện. Dịch vụ có parser CSV hỗ trợ trường có dấu nháy, kiểm tra cấu trúc tối thiểu, giới hạn kích thước 5 MB, timeout 15 giây, xử lý ca qua đêm và tổng hợp theo ngày, tháng, thư viện công việc và xu hướng 12 tháng. Đây là nền tảng nghiệp vụ có thể tái sử dụng tốt. [1]

API `timesheet.stats` được bảo vệ yêu cầu đăng nhập; giao diện mở từ menu **Chấm công** và hỗ trợ deep link `?view=timesheet`. Thành phần frontend sử dụng các biểu đồ sẵn có, bảng dữ liệu cuộn ngang và trạng thái lỗi/thử lại. Kiểm thử hiện có bao phủ parser CSV và phép tổng hợp ca đêm, nhưng chưa kiểm tra quyền theo tài khoản, nguồn dữ liệu, lỗi tải, bản dịch hoặc giao diện. [1]

## Các điểm cần chỉnh trước khi triển khai

### 1. Tách dữ liệu đúng người dùng

`protectedProcedure` chỉ bảo đảm người gọi đã đăng nhập. Nó chưa bảo đảm dữ liệu CSV trả về thuộc người đó, vì nguồn CSV và chuỗi lọc nhân sự đang là cấu hình dùng chung của máy chủ. Nếu TaskFlow có nhiều tài khoản, mọi tài khoản hợp lệ đều có thể thấy cùng thống kê của nhân sự được cấu hình.

Tôi đề xuất chọn một trong hai chế độ rõ ràng.

| Chế độ | Khi nên dùng | Thiết kế đề xuất |
|---|---|---|
| **Chỉ chủ sở hữu** | Bảng chấm công chỉ dành cho bạn | Chỉ cho `admin`/owner truy cập mục Chấm công; nguồn CSV và tên nhân sự giữ ở biến cấu hình phía máy chủ |
| **Theo từng tài khoản** | Mỗi người dùng có bảng chấm công riêng | Tạo bảng `timesheet_sources` theo `userId`, gồm nguồn dữ liệu, tên/mã nhân sự, thời điểm đồng bộ và trạng thái; router luôn lọc bằng `ctx.user.id` |

Với TaskFlow hiện tại, tôi khuyến nghị **chế độ theo từng tài khoản** để nhất quán với email, lịch và Gemini. Nếu bảng Google Sheets chứa thông tin nhân sự nhạy cảm, không nên dùng URL “Publish to web” công khai; thay vào đó nên dùng Google Sheets API qua service account, tệp CSV người dùng tải lên S3, hoặc một nguồn CSV có xác thực phía máy chủ.

### 2. Thay file trạng thái cục bộ bằng dữ liệu bền vững

Nhánh đọc trạng thái “báo cáo đã gửi” từ một file JSON cục bộ. Deployment Autoscale có thể chạy ở nhiều instance và không bảo đảm file cục bộ tồn tại lâu dài, vì vậy trạng thái này có nguy cơ mất hoặc không đồng nhất. Tôi sẽ thay bằng bảng database `timesheet_report_status` (hoặc S3 nếu cần lưu nhật ký tệp), khóa theo `userId`, năm và tháng.

### 3. Chuẩn hóa cấu hình nguồn và schema CSV

URL Google Sheets và tên nhân sự không được hard-code trong mã. Với chế độ theo từng tài khoản, chúng sẽ là metadata theo người dùng và URL có thể được lưu ở backend. Với chế độ chỉ chủ sở hữu, chúng sẽ được cung cấp bằng biến môi trường bảo mật. Dịch vụ sẽ giữ timeout/giới hạn 5 MB hiện có, đồng thời thay kiểm tra header theo vị trí cố định bằng ánh xạ tiêu đề chuẩn hóa để giảm rủi ro bảng tính bị thay đổi cột nhẹ.

### 4. Hoàn thiện trải nghiệm VI/EN và khả dụng

Giao diện mới giữ phong cách Swiss Design của TaskFlow nhưng chứa nhiều câu tiếng Việt trực tiếp trong component. Tôi sẽ đưa toàn bộ nhãn, mô tả, trạng thái trống và nội dung trợ năng vào cơ chế VI/EN đang dùng; đồng thời giữ bảng cuộn ngang trên điện thoại, nhãn biểu đồ dễ đọc và thông báo rõ khi không có dữ liệu hoặc nguồn chưa kết nối.

## Lộ trình triển khai đề xuất

| Giai đoạn | Công việc | Kết quả kiểm chứng |
|---|---|---|
| 1. Chốt phạm vi dữ liệu | Xác nhận chế độ chỉ chủ sở hữu hay theo tài khoản; xác nhận nguồn Google Sheets/CSV | Không có dữ liệu nhân sự bị chia sẻ sai |
| 2. Dữ liệu và cấu hình | Thêm schema nguồn chấm công và trạng thái báo cáo; migration không phá hủy | Truy vấn và cập nhật luôn bị giới hạn `userId` |
| 3. Dịch vụ tải và tổng hợp | Kế thừa parser/tổng hợp từ nhánh; thêm ánh xạ cột, cache và lỗi có thể hành động | Test dữ liệu hợp lệ, CSV lỗi, timeout, kích thước, ca đêm |
| 4. API và phân quyền | Mở rộng tRPC theo chế độ đã chọn; không trả URL nguồn hoặc dữ liệu thô ra client | Test cô lập hai người dùng và quyền owner nếu áp dụng |
| 5. Giao diện | Tích hợp màn hình, menu, deep link, VI/EN, dark mode và mobile | Ảnh desktop/mobile, bàn phím, trạng thái tải/lỗi/rỗng |
| 6. Phát hành | Chạy `pnpm check`, `pnpm test`, build production và xác minh nguồn thật | Checkpoint có thể rollback, production dùng cấu hình an toàn |

> **Khuyến nghị triển khai:** Hợp nhất phần UI và thuật toán tổng hợp từ nhánh, nhưng thay tầng cấu hình nguồn, phân quyền và trạng thái báo cáo trước khi công bố. Không cần ghi đè các cải tiến Gemini/chatbot đã có trên nhánh chính.

## Xác nhận cần có trước khi bắt đầu

Bạn chỉ cần xác nhận hai điểm sau. Thứ nhất, bảng chấm công này **chỉ cho tài khoản của bạn** hay **mỗi người dùng tự kết nối bảng riêng**? Thứ hai, bạn muốn tiếp tục dùng Google Sheets xuất CSV hay muốn kết nối Google Sheets riêng tư qua service account/tải CSV lên TaskFlow?

## Tài liệu tham chiếu

[1]: https://github.com/tanphap/taskflow-planner/tree/feature/timesheet-dashboard "Nhánh feature/timesheet-dashboard"
