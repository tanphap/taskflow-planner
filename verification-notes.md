# Visual Verification Notes

## 2026-08-17

Giao diện đã được kiểm tra ở kích thước 1280×720 và 375×812. Bố cục dashboard giữ được hệ lưới Swiss Design, độ tương phản đen–trắng–đỏ rõ ràng, thanh điều hướng desktop và nút mở menu trên thiết bị di động hiển thị phù hợp. Hero, hành động nhanh, danh sách công việc và lịch hẹn co giãn theo chiều dọc trên màn hình hẹp mà không xuất hiện thanh cuộn ngang.

Kiểm tra trực quan cũng xác nhận các trạng thái rỗng vẫn có thông điệp và hành động tiếp theo rõ ràng. Không phát hiện lỗi chồng lấn hoặc nội dung khó đọc trong hai khung hình đã kiểm tra.

Phiên xem trước đã xác thực tiếp tục hiển thị dashboard đúng sau các thay đổi cuối cùng. Kiểm tra kiểu dữ liệu hoàn tất thành công và sáu kiểm thử Vitest đều đạt, bao gồm phân tách định danh người dùng tại router cùng validation ngăn lịch hẹn có thời gian kết thúc không hợp lệ và công việc không có tiêu đề.

Người dùng đã xác nhận hoàn tất đăng nhập Manus OAuth trong phiên xem trước. Phiên trình duyệt kiểm chứng độc lập không chia sẻ cookie với phiên xem trước nên vẫn hiển thị màn hình đăng nhập, nhưng màn hình preview xác thực đã hiển thị dashboard cho tài khoản người dùng trong ảnh kiểm tra.

Kiểm chứng trực tiếp bằng **My Browser** sau đăng nhập: dashboard hiển thị được tên và email tài khoản, số liệu tổng quan cùng trạng thái rỗng; trang **Công việc** hiển thị bộ lọc trạng thái, bộ lọc ưu tiên, thao tác thêm công việc và trạng thái rỗng phù hợp. Hai màn hình đều tải thành công, không xuất hiện thông báo lỗi trong giao diện.

Trang **Lịch hẹn** đã được kiểm tra trực tiếp ở chế độ tháng và tuần. Chế độ tháng hiển thị lưới 7 cột cùng điều hướng tháng; chế độ tuần hiển thị chính xác bảy ngày liên tiếp từ Thứ 2 đến Chủ nhật, có ô trạng thái trống rõ ràng cho mỗi ngày. Các nút chuyển THÁNG / TUẦN / NGÀY và thao tác tạo lịch hẹn đều hiển thị trong phiên xác thực.

Trang **Nhắc việc** hiển thị chính xác số lượng cảnh báo hiện có, trạng thái rỗng và diễn giải về việc đồng bộ nhắc việc trong ứng dụng. Trang **Hồ sơ cá nhân** hiển thị dữ liệu của tài khoản Manus đang đăng nhập, biểu mẫu tên hiển thị và email, nút lưu thay đổi, cùng thông tin nhấn mạnh rằng dữ liệu công việc, lịch hẹn và nhắc việc được phân tách theo người dùng. Không thực hiện thao tác ghi dữ liệu vào tài khoản trong quá trình kiểm chứng này.

Sau tích hợp Telegram, biểu mẫu tạo lịch hẹn đã được mở trực tiếp trong **My Browser**. Checkbox “Gửi nhắc qua Telegram” hiển thị cùng điều kiện cần liên kết Telegram và xuất bản ứng dụng. Khi bật checkbox, điền tiêu đề và gửi biểu mẫu nhưng bỏ trống “Nhắc vào lúc”, giao diện giữ nguyên biểu mẫu, không lưu lịch hẹn và hiển thị toast lỗi màu đỏ: “Hãy chọn thời điểm nhắc để gửi Telegram”.

Cuộc trò chuyện riêng đã gửi đúng mã liên kết tới Telegram Bot. Trên phiên Manus OAuth đã đăng nhập, Hồ sơ chuyển sang trạng thái “Đã liên kết” và thông báo rõ rằng lời nhắc Telegram sẽ được gửi riêng đến cuộc trò chuyện Bot này.

Kiểm chứng trực tiếp bộ chọn ngôn ngữ trong phiên Manus OAuth: các nút **VI** và **EN** hiện diện ở thanh đầu trang. Khi chọn **EN**, điều hướng, tiêu đề dashboard, nút thao tác, trạng thái công việc, nhãn thống kê và định dạng ngày chuyển sang English; lựa chọn được duy trì trong trình duyệt.

Kiểm tra responsive ở khung nhìn 375×812 xác nhận bộ chọn **VI/EN** vẫn hiển thị cạnh thao tác nhanh, không che tiêu đề và dashboard tiếp tục giữ lưới Swiss Design dễ đọc trên thiết bị di động.

Kiểm chứng English trên desktop xác nhận điều hướng, nút tạo lịch, nhãn ngày trong tuần và chế độ Month/Week/Day đã chuyển sang English. Tiêu đề tháng vẫn giữ locale Tiếng Việt ở thời điểm kiểm tra, được ghi nhận để điều chỉnh trước khi bàn giao.

Nguyên nhân tiêu đề tháng còn tiếng Việt được xác định là thuộc tính `lang` của tài liệu chưa đồng bộ khi khôi phục lựa chọn English từ bộ nhớ trình duyệt. Đã bổ sung đồng bộ `document.documentElement.lang` theo lựa chọn ngôn ngữ khi khởi tạo và mỗi lần thay đổi.

Kiểm tra lại sau khi tải mới phiên English xác nhận ngày ở dashboard hiển thị “Monday, August 17” và tiêu đề lịch tháng hiển thị “August 2026”. Nhật ký HMR sau cập nhật mới nhất chỉ có `hmr update` cho LanguageContext, không còn cảnh báo `Could not Fast Refresh`.

Sau tái cấu trúc Provider/hook ngôn ngữ, phiên xem trước tải lại thành công và vẫn giữ English: dashboard hiển thị đầy đủ điều hướng, ngày tháng, thao tác nhanh và nhãn thống kê bằng English.

Kiểm chứng sau HMR ở trang Hồ sơ xác nhận English và Tiếng Việt đều hiển thị đúng điều hướng, nhãn nhập tên/email, nút lưu, trạng thái Telegram đã liên kết và phần mô tả kênh nhắc. Ngày tiêu đề trên thanh trên cùng vẫn là English khi chuyển về Tiếng Việt, được ghi nhận để đồng bộ trước khi bàn giao.

Sau điều chỉnh, dashboard Tiếng Việt hiển thị ngày tiêu đề đúng là “Thứ Hai, 17 tháng 8” và các nhãn/ngày liên quan chuyển theo Tiếng Việt. Phiên My Browser được khởi tạo lại sau thao tác kiểm chứng nên trở về màn hình đăng nhập OAuth; không thực hiện bất kỳ thay đổi dữ liệu nào trong bước này.

Lần kiểm tra HMR mới nhất sau khi cập nhật mô-đun ngôn ngữ chỉ ghi `hmr update /src/index.css, /src/pages/Home.tsx, /src/contexts/LanguageContext.tsx`; không có dòng `Could not Fast Refresh`.

Kiểm chứng sau tái cấu trúc LanguageContext/useLanguage trong phiên đã xác thực: Overview, Tasks và Calendar hiển thị ổn định bằng English; bộ lọc trạng thái/mức ưu tiên, lịch tháng, tên tháng, ngày trong tuần và lựa chọn Month/Week/Day đều hiển thị chính xác.

Reminder center và Profile cũng tải ổn định bằng English, gồm trạng thái Telegram Connected. Tuy nhiên, tiêu đề số lượng ở Reminder center vẫn hiển thị “Có 0 điều cần chú ý” bằng Tiếng Việt khi chọn English; chuỗi này được ghi nhận để dịch đầy đủ trước checkpoint.

Sau điều chỉnh chuỗi động, trung tâm nhắc việc English hiển thị đúng “0 reminders need attention”; nhãn phần, trạng thái trống và mô tả đồng bộ đều giữ English.

Sau khi chuyển về Tiếng Việt, trung tâm nhắc việc hiển thị nhất quán “0 điều cần chú ý”, ngày tiêu đề “Thứ Hai, 17 tháng 8” và toàn bộ nhãn liên quan bằng Tiếng Việt.

Kiểm tra khung nhìn mobile 375×812 xác nhận thanh tiêu đề giữ được nút menu, bộ chọn VI/EN và thao tác tạo nhanh; dashboard Swiss Design xếp dọc rõ ràng, các thao tác nhanh và số liệu không bị che khuất hoặc tràn màn hình.

Sau xuất bản, phiên bản production tại `taskflow-48gdovno.manus.space` tải đúng trong phiên Manus OAuth đã xác thực; Dashboard và Calendar hiển thị ổn định bằng English, còn danh sách Heartbeat chưa có tác vụ vì chưa tạo lịch hẹn bật nhắc Telegram.

Đã mở biểu mẫu tạo lịch hẹn trên production và chuẩn bị lịch hẹn kiểm chứng có tiêu đề “Telegram reminder test”; bước tiếp theo là đặt thời gian bắt đầu, kết thúc và nhắc Telegram tối thiểu hai phút sau thời điểm hiện tại.

Thời điểm bắt đầu của lịch hẹn kiểm chứng đã được đặt thành 19:14 ngày 17/08/2026. Một phản hồi trình duyệt bị chậm, nhưng dữ liệu đã được áp dụng đúng trong biểu mẫu và không có dữ liệu nào được lưu ngoài ý muốn.

Biểu mẫu kiểm chứng hiện có thời gian bắt đầu 19:14, kết thúc 19:44 và nhắc lúc 19:12 ngày 17/08/2026. Các thời điểm này hợp lệ và lời nhắc cách thời điểm hiện tại ít nhất hai phút.

Sau khi bật gửi nhắc Telegram và có xác nhận của người dùng, thao tác tạo lịch hẹn đã được thực hiện. Biểu mẫu vẫn đang mở, nên cần xác minh trạng thái lưu hoặc thông báo validation trước khi kết luận lịch đã được tạo.

Lần tạo lịch hẹn kiểm chứng trên production ban đầu bị từ chối đúng quy tắc vì thời điểm nhắc đã qua; giao diện hiển thị toast “Nhắc Telegram phải cách thời điểm hiện tại ít nhất một phút.” Sau khi điều chỉnh thời gian hợp lệ, yêu cầu tạo hiển thị trạng thái đang xử lý nhưng chưa hoàn tất trong lần kiểm tra này.

Lịch hẹn “Telegram reminder test” đã được lưu với tác vụ Heartbeat `J3m2NqAoSt7CpdqRfHHzDD`. Lịch sử Heartbeat ghi nhận lần thực thi thành công lúc `2026-08-17T12:31:00Z`, phản hồi `{"ok":true,"eventId":1}`. Cơ sở dữ liệu ghi `telegramSentAt` tương ứng và không có `telegramDeliveryError`, xác nhận Bot đã gửi nhắc một lần thành công.

Theo xác nhận của người dùng, lịch hẹn kiểm chứng và tác vụ Heartbeat liên quan đã được xóa. Truy vấn xác minh không còn bản ghi mang tiêu đề “Telegram reminder test”; thông báo trong ứng dụng phát sinh từ lịch hẹn này cũng đã được dọn.

## Mở rộng lịch lặp lại, nhắc nhanh và lịch sử Telegram

Đã chạy thành công `pnpm check` và `pnpm test`: **21 kiểm thử Vitest** đều đạt. Phạm vi kiểm thử gồm chuỗi lặp daily với khoảng tùy chỉnh và bảo toàn độ lệch nhắc, weekly với các ngày đã chọn theo tuần xen kẽ, monthly với ngày 31 tự co về ngày cuối tháng ngắn, giới hạn theo ngày/số lần, tính nhắc nhanh 5/15/30 phút, phân tách lịch sử Telegram theo `userId`, và cron Telegram cho lịch hằng tháng.

Ảnh xem trước ở 1280×720 vẫn tải Dashboard đã xác thực, duy trì bố cục Swiss Design và không có lỗi TypeScript/runtime do phần mở rộng mới. Tuy nhiên, kiểm chứng thao tác trực tiếp các điều khiển mới trong EventDialog/Hồ sơ chưa thể thực hiện trong phiên này: trình duyệt liên kết trả về lỗi timeout, còn trình duyệt sandbox thay thế không có cookie Manus OAuth và chỉ hiển thị màn hình đăng nhập. Không tạo lịch hẹn kiểm chứng mới, không gọi Bot và không ghi dữ liệu vào tài khoản người dùng trong bước này.

Vì vậy, luồng gửi Telegram lặp lại được xác minh ở mức logic và kiểm thử: cron hằng tháng chạy mỗi ngày tại đúng giờ nhắc để hỗ trợ ngày 29/30/31, handler chỉ nhận lần xuất hiện đến hạn và marker `telegramSentAt` theo đúng `reminderAt` ngăn gửi trùng. Cần kiểm chứng thủ công trên production sau khi có lại phiên OAuth nếu muốn xác nhận hành vi Bot từ đầu đến cuối cho một chuỗi lặp thực tế.
