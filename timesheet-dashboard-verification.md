# Xác minh Timesheet Dashboard

- Ngày kiểm tra: 24/08/2026.
- Bản xem trước ban đầu hiển thị trạng thái tải kéo dài khi tải nguồn CSV Google Sheets khoảng 1,59 MB; nhật ký xác nhận endpoint số liệu chạm giới hạn 15 giây.
- Đã tăng thời gian chờ server lên 30 giây và thêm cache CSV nội bộ 5 phút để endpoint danh sách tên và số liệu tái sử dụng cùng dữ liệu nguồn.
- Cả URL nguồn lẫn CSV thô chỉ được truy cập ở máy chủ. Dashboard giới hạn cho chủ sở hữu nguồn dữ liệu và lọc chính xác theo tên được chọn.

Sau khi tải lại, dashboard hiển thị danh sách tên, bộ lọc tháng/năm và số liệu của người đã chọn thành công. Bản tiếng Anh đã được kiểm tra trên desktop; bố cục điện thoại giữ bộ chọn tên ở phần đầu và xếp KPI, biểu đồ, bảng theo một cột có thể đọc được.
