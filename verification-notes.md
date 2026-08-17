# Visual Verification Notes

## 2026-08-17

Giao diện đã được kiểm tra ở kích thước 1280×720 và 375×812. Bố cục dashboard giữ được hệ lưới Swiss Design, độ tương phản đen–trắng–đỏ rõ ràng, thanh điều hướng desktop và nút mở menu trên thiết bị di động hiển thị phù hợp. Hero, hành động nhanh, danh sách công việc và lịch hẹn co giãn theo chiều dọc trên màn hình hẹp mà không xuất hiện thanh cuộn ngang.

Kiểm tra trực quan cũng xác nhận các trạng thái rỗng vẫn có thông điệp và hành động tiếp theo rõ ràng. Không phát hiện lỗi chồng lấn hoặc nội dung khó đọc trong hai khung hình đã kiểm tra.

Phiên xem trước đã xác thực tiếp tục hiển thị dashboard đúng sau các thay đổi cuối cùng. Kiểm tra kiểu dữ liệu hoàn tất thành công và sáu kiểm thử Vitest đều đạt, bao gồm phân tách định danh người dùng tại router cùng validation ngăn lịch hẹn có thời gian kết thúc không hợp lệ và công việc không có tiêu đề.

Người dùng đã xác nhận hoàn tất đăng nhập Manus OAuth trong phiên xem trước. Phiên trình duyệt kiểm chứng độc lập không chia sẻ cookie với phiên xem trước nên vẫn hiển thị màn hình đăng nhập, nhưng màn hình preview xác thực đã hiển thị dashboard cho tài khoản người dùng trong ảnh kiểm tra.

Kiểm chứng trực tiếp bằng **My Browser** sau đăng nhập: dashboard hiển thị được tên và email tài khoản, số liệu tổng quan cùng trạng thái rỗng; trang **Công việc** hiển thị bộ lọc trạng thái, bộ lọc ưu tiên, thao tác thêm công việc và trạng thái rỗng phù hợp. Hai màn hình đều tải thành công, không xuất hiện thông báo lỗi trong giao diện.

Trang **Lịch hẹn** đã được kiểm tra trực tiếp ở chế độ tháng và tuần. Chế độ tháng hiển thị lưới 7 cột cùng điều hướng tháng; chế độ tuần hiển thị chính xác bảy ngày liên tiếp từ Thứ 2 đến Chủ nhật, có ô trạng thái trống rõ ràng cho mỗi ngày. Các nút chuyển THÁNG / TUẦN / NGÀY và thao tác tạo lịch hẹn đều hiển thị trong phiên xác thực.

Trang **Nhắc việc** hiển thị chính xác số lượng cảnh báo hiện có, trạng thái rỗng và diễn giải về việc đồng bộ nhắc việc trong ứng dụng. Trang **Hồ sơ cá nhân** hiển thị dữ liệu của tài khoản Manus đang đăng nhập, biểu mẫu tên hiển thị và email, nút lưu thay đổi, cùng thông tin nhấn mạnh rằng dữ liệu công việc, lịch hẹn và nhắc việc được phân tách theo người dùng. Không thực hiện thao tác ghi dữ liệu vào tài khoản trong quá trình kiểm chứng này.
