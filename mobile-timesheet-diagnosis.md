# Chẩn đoán lịch trực trên điện thoại

Ngày kiểm tra: 24/08/2026.

Ở màn hình rộng 375 px, lịch trực hiện được đặt sau toàn bộ dữ liệu chấm công cá nhân và bị che bởi trạng thái tải chung trong `TimesheetDashboard`. Khi dữ liệu Google Sheets chậm, người dùng không thể xem lịch trực dùng chung dù truy vấn lịch trực là độc lập. Sau khi tải xong, lưới tháng bảy cột chỉ còn khoảng 50 px mỗi ô, khiến tên ca bị cắt và khó đọc.

Hướng sửa: hiển thị lịch trực trước, không phụ thuộc vào các truy vấn chấm công chi tiết; giữ lưới tháng trên màn hình từ `sm` trở lên và dùng danh sách theo ngày có thể đọc được ở màn hình nhỏ.

Kết quả xác minh sau sửa: ở 375 px, lịch trực hiển thị đầu trang theo các ngày với thẻ ca S/Đ, tên nhân sự và dấu điều chỉnh có thể đọc được; ở desktop, lưới tháng bảy cột vẫn được giữ nguyên. Danh sách lịch trực được tải và hiển thị trước phần thống kê Google Sheets.
