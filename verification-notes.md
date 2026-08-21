# Visual Verification Notes

## 2026-08-17

## Chuyển đổi IMAP (Gmail + Outlook/Microsoft 365)

Kiểm chứng trực tiếp trong phiên **My Browser** đã đăng nhập cho thấy mục **Quản trị email** tải ổn định sau khi chuyển luồng đồng bộ sang IMAP. Giao diện hiển thị hai thẻ rõ ràng: Gmail dùng `imap.gmail.com:993` qua TLS cùng các trường email, tên đăng nhập IMAP tùy chọn và mật khẩu ứng dụng; Outlook/Microsoft 365 dùng IMAP với nút OAuth2 riêng phù hợp Modern Auth. Không có mật khẩu hoặc token nào hiển thị trong danh sách tài khoản và chú thích trên giao diện nêu rõ secret có thể bị xóa khi ngắt kết nối.

Trong môi trường hiện tại chưa cấu hình `EMAIL_TOKEN_ENCRYPTION_KEY` hay Microsoft OAuth nên các thẻ hiển thị đúng trạng thái **CẦN CẤU HÌNH** và nút Outlook bị vô hiệu hóa có giải thích. Không gửi dữ liệu đăng nhập, không kết nối hộp thư và không thay đổi dữ liệu người dùng trong kiểm chứng trực quan này.

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

## Luồng Công việc → Lịch hẹn

Đã kiểm chứng trực tiếp trong phiên Manus OAuth trên desktop: từng dòng Công việc hiển thị nút **“Đặt lịch hẹn”**. Với công việc “mua gạo”, thao tác mở EventDialog và tiền điền tiêu đề, thời hạn thành giờ bắt đầu, giờ kết thúc mặc định thêm 60 phút, cùng thời điểm nhắc đã lưu. Với công việc “tắm” có ghi chú, EventDialog tiền điền cả tiêu đề lẫn mô tả. Đã đóng bằng **Hủy** ở cả hai trường hợp; không tạo lịch hẹn hoặc thay đổi dữ liệu người dùng.

Đã chuyển sang English và xác nhận nhãn thành **“Schedule event”**, EventDialog dùng nhãn English, đồng thời tùy chọn **Send reminder via Telegram** vẫn hiện diện. Kiểm thử không tạo sự kiện mới hoặc gửi Telegram vì mục tiêu là xác nhận tiền điền và giao diện, không phải tạo dữ liệu kiểm chứng.

Người dùng đã kiểm tra bản đã xuất bản trên thiết bị di động thực và xác nhận luồng hoạt động ổn: từ danh sách Công việc mở được biểu mẫu lịch hẹn, dữ liệu tiền điền hiển thị đúng, có thể cuộn biểu mẫu và thao tác phần Telegram rõ ràng. Không ghi nhận lỗi giao diện hoặc yêu cầu điều chỉnh thêm.

## Đồng bộ frontend từ GitHub

Commit frontend mới chỉ thay đổi `client/src/pages/Home.tsx` và `client/src/index.css`; không có thay đổi tại router tRPC, backend, database schema, migration hoặc secrets. Do đó các hợp đồng OAuth, dữ liệu công việc/lịch hẹn, nhắc Telegram và phân tách `userId` được giữ nguyên.

Đã chạy `pnpm check` thành công và **23 kiểm thử Vitest** đều đạt. Ảnh kiểm tra dashboard đã xác thực ở desktop cho thấy shell, sidebar và các luồng dữ liệu vẫn tải bình thường. Trên khung nhìn điện thoại 375×812, bản frontend mới ban đầu làm tiêu đề header bị chật với bộ chọn VI/EN và nút tạo nhanh; đã điều chỉnh vùng tiêu đề co giãn, ẩn dòng phụ dưới 440px và giữ cụm điều khiển không co. Ảnh kiểm tra lại xác nhận tiêu đề “Tổng quan hôm nay”, nút menu, VI/EN và nút tạo cùng hiển thị rõ ràng, không chồng lấn.

Kiểm tra lại ở desktop 1280×720 sau cùng xác nhận sidebar cố định, header với bộ chọn VI/EN, ngày hiện tại và nút tạo công việc, khối tổng quan, hành động nhanh và hai khu vực trạng thái rỗng đều hiển thị đầy đủ. Không thấy tràn, chồng lấn hay lỗi runtime của giao diện sau đồng bộ.

Xác minh lại bằng My Browser trong phiên Manus OAuth đang đăng nhập: trang Overview hiển thị tài khoản “Phap Nguyen”, email, số liệu dashboard, sidebar, các điều khiển VI/EN và thông báo nhắc việc. Như vậy giao diện desktop đã đồng bộ GitHub tải đúng với dữ liệu đã xác thực; không thực hiện thao tác ghi hoặc thay đổi dữ liệu trong lần kiểm tra này.

## Đồng bộ frontend GitHub — Focus Workspace

Lần đồng bộ GitHub mới nhất chỉ thay đổi `client/src/pages/Home.tsx` và `client/src/index.css`, chuyển nhận diện phụ thành “Focus Workspace” cùng hệ màu xanh lá–cam. Không có thay đổi vào backend, schema Drizzle, OAuth, Telegram, hoặc các thủ tục tRPC. Đã chạy `pnpm check` thành công và **23 kiểm thử Vitest** đều đạt.

Trong phiên My Browser đã đăng nhập, Overview tải đúng dữ liệu tài khoản, số liệu dashboard, sidebar, nhắc việc và các nút hành động; không thấy hồi quy OAuth/tRPC hoặc lỗi giao diện. Hero mobile được bổ sung vùng đệm để không đi vào dưới khối trang trí cam. Người dùng đã kiểm tra trực tiếp trên điện thoại và xác nhận tiêu đề hiển thị bình thường, cùng hai nút “Tạo công việc mới” và “Xem lịch hẹn” hoạt động được; không tạo hoặc thay đổi dữ liệu trong lần kiểm tra.

## Nền tảng Quản trị email

Đã chạy `pnpm check` thành công và **26 kiểm thử Vitest** đều đạt, gồm hai kiểm thử mới cho mã hóa AES-256-GCM của token OAuth và từ chối khóa mã hóa thiếu hoặc không hợp lệ. Mức kiểm thử hiện tại bao phủ lớp OAuth, đồng bộ và cô lập dữ liệu ở phạm vi mã nguồn; không dùng thông tin đăng nhập email hoặc gửi yêu cầu đến Gmail/Microsoft Graph.

Dashboard sau khi thêm mục điều hướng **Quản trị email** vẫn tải ổn định ở 1280×720 và 375×812. Trên mobile, tiêu đề, nút mở menu, chuyển ngôn ngữ và nút tạo giữ được vùng chạm rõ ràng; các khối Swiss Design xếp dọc, không có thanh cuộn ngang, chồng lấn hoặc chữ khó đọc. Chưa thể kiểm chứng đầu-cuối OAuth Gmail/Microsoft vì dự án chưa được cung cấp OAuth Client ID/Secret thực tế; không truy cập hay thay đổi dữ liệu email của người dùng trong kiểm tra này.

## AI nhận diện lịch hẹn từ email

Đã kiểm tra trực tiếp trong **My Browser** với phiên Manus OAuth đã đăng nhập: mở mục **Quản trị email** thành công, hiển thị rõ hai lựa chọn Gmail và Outlook/Microsoft 365, trạng thái yêu cầu cấu hình OAuth, vùng hộp thư trống, bộ lọc inbox, cùng phần **AI Event Inbox**. Phần AI nêu rõ rằng hệ thống chỉ tạo đề xuất và người dùng phải xác nhận trước khi tạo lịch hẹn hoặc nhắc Telegram. Ở trạng thái chưa kết nối hộp thư, thông điệp hướng dẫn đồng bộ thư rồi chọn “Quét AI ngay” hoặc bật quét tự động hiển thị đúng; không có thao tác ghi dữ liệu hoặc truy cập hộp thư thực nào được thực hiện.

Đã chạy `pnpm check`, `pnpm build` và `pnpm test` thành công sau phần mở rộng AI-email. Production build hoàn tất; chỉ có cảnh báo kích thước chunk frontend lớn hơn 500 kB, không chặn build. Bộ kiểm thử hiện có **35 Vitest tests** đều đạt, bổ sung kiểm chứng chuẩn hóa đề xuất AI, lọc liên kết chỉ có trong email nguồn, ngưỡng tin cậy, state/PKCE OAuth, callback state hết hạn/giả mạo, chống tạo đề xuất trùng khi quét lặp cùng email, và handler Heartbeat chạy đúng theo cặp `userId`–`emailAccountId`, bỏ qua tác vụ vô hiệu và lưu lỗi chạy an toàn.

Tùy chọn quét AI nằm trên từng hộp thư đã kết nối: người dùng có thể bật/tắt riêng và chọn 15 phút, 30 phút, 1 giờ, 2 giờ, 4 giờ, 12 giờ hoặc mỗi ngày. Khi AI phát hiện lịch đủ tin cậy, người dùng mở **Xem và tạo lịch hẹn** để xem/chỉnh sửa dữ liệu trong EventDialog hiện có trước khi chấp nhận; bản ghi đề xuất gốc không có màn hình chỉnh sửa độc lập. Do chưa có OAuth Client ID/Secret thực tế, việc kết nối Gmail/Outlook, nhận thư thật và xác minh Heartbeat production vẫn là blocker cần hoàn tất sau khi cấu hình secrets.

## Lịch âm Việt Nam và ngày lễ

Đã bổ sung tiện ích dùng múi giờ Việt Nam để chuyển đổi ngày dương sang lịch âm, hiển thị ngày âm với kiểu chữ phụ bên dưới ngày dương trong các chế độ **tháng, tuần và ngày**. Các ngày lễ cố định và theo âm lịch được gắn nhãn riêng, gồm Tết Dương lịch, Tết Nguyên đán, Giỗ Tổ Hùng Vương, Ngày Giải phóng miền Nam, Quốc tế Lao động và Quốc khánh. Phạm vi hiện tại không tự suy diễn ngày nghỉ bù vì ngày này cần quyết định công bố theo từng năm.

Đã chạy `pnpm check`, `pnpm build` và `pnpm test` thành công. Bộ kiểm thử có **43 Vitest tests**, trong đó có ba kiểm thử mốc lịch âm/ngày lễ Việt Nam. Ảnh chụp ở phiên xem trước độc lập không có cookie Manus OAuth nên chỉ hiển thị trạng thái đăng nhập; tuy nhiên, kiểm chứng trực tiếp trong **My Browser** đã đăng nhập xác nhận Lịch tháng 8/2026 hiển thị ngày âm nhỏ như `14/6 ÂL` dưới ngày dương ở tất cả ô ngày, không chồng lấn lịch hẹn cá nhân. Ô ngày 02/09 ở hàng chuyển tháng hiển thị nhãn **Quốc khánh**. Không có dữ liệu lịch hẹn nào được tạo hoặc thay đổi trong quá trình kiểm chứng.

## Ghi chú email và Tổng quan AI

Đã hoàn thiện phần **Tổng quan AI** trong Quản trị email với bốn chỉ số tách theo tài khoản Manus đang đăng nhập: tổng email đã đồng bộ, số email đã tóm tắt bằng Gemini, đề xuất lịch hẹn AI đang chờ xác nhận và số ghi chú email. Giao diện nêu rõ phạm vi dữ liệu hiện tại; AI chỉ tạo đề xuất và người dùng vẫn phải chủ động xác nhận trước khi lịch hẹn hoặc nhắc Telegram được tạo.

## Chuông thông báo email và việc tới hạn

Đã bổ sung chuông thông báo trong thanh đầu trang, hoạt động theo tài khoản Manus đang đăng nhập. Badge đỏ chỉ xuất hiện khi có email mang trạng thái **Mới** hoặc nhắc việc/lịch hẹn đã đến thời điểm nhưng chưa đọc. Khi mở chuông, bảng cảnh báo phân tách rõ hai nhóm: email mới và việc cần chú ý; mỗi dòng mở đúng khu vực Quản trị email hoặc Trung tâm nhắc việc. Thao tác đánh dấu tất cả nhắc việc đã đọc dùng API hiện có, không thay đổi trạng thái email.

Chuỗi hiển thị, aria-label và trạng thái rỗng đều hỗ trợ VI/EN. Đã thêm tiện ích `shared/notificationBell.ts` và hai kiểm thử đơn vị: chỉ đếm email trạng thái `new`, cộng chính xác các nhắc việc tới hạn, và không hiện badge khi cả hai nhóm đều rỗng. Xác nhận cuối cùng: `pnpm check`, production build và **47 kiểm thử Vitest** đều đạt. Ảnh kiểm tra ở 1280×720 và 375×812 xác nhận chuông giữ tỷ lệ rõ ràng trong header, không che bộ chọn ngôn ngữ, tiêu đề hay nút tạo nhanh. Chưa kết nối hộp thư hoặc tạo nhắc việc thực tế trong bước kiểm chứng giao diện này.

## Email AI mới nhất trên Overview

Overview đã có khối **Email AI mới nhất** hiển thị tối đa ba email được Gemini tóm tắt gần nhất. Mỗi thẻ hiển thị tiêu đề, người gửi, ngày tạo và phần tóm tắt, đồng thời dẫn trực tiếp tới Quản trị email khi người dùng muốn xem ngữ cảnh thư. Khi chưa có tóm tắt, khối giữ trạng thái rỗng rõ ràng và không tự gửi hoặc tự quét bất cứ nội dung email nào.

Khối mới hỗ trợ VI/EN, dùng dữ liệu `recentSummaries` từ API tổng quan AI đã cô lập theo `userId`. Kiểm thử router xác nhận danh sách tóm tắt gần nhất được trả về nguyên vẹn trong phạm vi tài khoản hiện tại. Đã xác nhận `pnpm check`, production build và **47 kiểm thử Vitest** đều đạt. Ảnh ở 1280×720 và 375×812 cho thấy khối có tỷ lệ đọc tốt, trạng thái rỗng không tràn ngang và giữ khoảng cách hợp lý trong hệ lưới Swiss Design. Chưa có Gmail IMAP thực tế kết nối trong kiểm chứng này nên ảnh chỉ thể hiện trạng thái rỗng; không có email, ghi chú hay lịch hẹn nào được tạo hoặc thay đổi.

Khu vực **Ghi chú email** hỗ trợ tạo, sửa, xóa, ghim ghi chú và liên kết tùy chọn tới hộp thư/thư nguồn đã đồng bộ. Bản ghi được truy vấn và thao tác theo `userId`; kiểm thử router xác nhận các API tổng quan, danh sách, tạo, sửa và xóa ghi chú luôn nhận định danh người dùng hiện tại. Tiêu đề rỗng bị chặn trước khi gọi tầng dữ liệu. Các nhãn, biểu mẫu, trạng thái trống, nhãn ghim và thao tác đã được nối với cơ chế VI/EN hiện có.

Ảnh chụp tại 1280×720 và 375×812 cho thấy bốn thẻ số liệu, biểu mẫu ghi chú và trạng thái rỗng xếp rõ ràng theo lưới Swiss Design, không có thanh cuộn ngang hay phần tử chồng lấn. Kiểm tra cuối cùng xác nhận `pnpm check`, `pnpm build` và **45 kiểm thử Vitest** đều đạt. Production build chỉ đưa ra cảnh báo thông tin về kích thước chunk frontend vượt 500 kB; quá trình build vẫn hoàn tất thành công. Không kết nối hộp thư thực tế, không gửi dữ liệu email sang Gemini và không tạo hoặc thay đổi ghi chú người dùng trong quá trình kiểm chứng trực quan.

## Tóm tắt Gemini không giới hạn trong ứng dụng

Đã gỡ bỏ hạn mức **10 lượt tóm tắt mới mỗi ngày** của TaskFlow. Người dùng có thể chủ động tóm tắt không giới hạn các email Gmail đã chọn trong giao diện; thư vẫn không bị quét tự động và hộp xác nhận quyền riêng tư trước mỗi yêu cầu vẫn được giữ nguyên. API không còn truy vấn hoặc trả về chỉ số lượt tóm tắt còn lại theo ngày.

Kiểm thử router mới xác nhận luồng tóm tắt không gọi truy vấn đếm theo ngày, lưu tóm tắt cho đúng `userId`/thư nguồn và không trả về trường `remainingToday`. Đã xác nhận `pnpm check`, production build và **48 kiểm thử Vitest** đều đạt. Ảnh ở 1280×720 và 375×812 xác nhận phần mô tả Gemini ghi rõ không có hạn mức theo ngày trong ứng dụng, không bị tràn hoặc chồng lấn. Gemini/Google vẫn có thể áp dụng giới hạn kỹ thuật hoặc điều khoản dịch vụ độc lập; TaskFlow sẽ hiển thị lỗi nhà cung cấp nếu phát sinh, thay vì áp hạn mức riêng của ứng dụng.

## Gỡ Ghi chú email khỏi Quản trị email

Theo yêu cầu, đã gỡ toàn bộ khu vực **Ghi chú email** khỏi giao diện Quản trị email, gồm biểu mẫu tạo/sửa, danh sách, thao tác ghim và xóa. Trang không còn tải truy vấn ghi chú hoặc khởi tạo mutation tạo, sửa, xóa ghi chú; thẻ Tổng quan AI cũng được tinh gọn còn ba số liệu là tổng email, email đã tóm tắt và đề xuất AI đang chờ.

Thay đổi này chỉ loại bỏ phần hiển thị và các yêu cầu dữ liệu của frontend. Bảng `emailNotes`, API và các ghi chú đã lưu vẫn được giữ nguyên, nên không xảy ra mất dữ liệu và có thể khôi phục giao diện sau này nếu cần. Đã xác nhận `pnpm check`, production build và **48 kiểm thử Vitest** đều đạt. Ảnh kiểm chứng 1280×720 và 375×812 cho thấy Quản trị email liền mạch từ Tổng quan AI sang Đề xuất lịch hẹn AI, không còn thẻ Ghi chú email, không có thanh cuộn ngang hoặc chồng lấn thành phần.

## Đồng bộ giao diện GitHub mới

Đã kiểm tra remote `user_github` và lấy các commit mới trên nhánh `main`, gồm giao diện thiết kế lại từ pull request `design/claude-inspired-ui`. Thay đổi được hợp nhất bằng fast-forward từ commit `e4f6570` sang `36b70b0`, cập nhật trang chính, CSS chủ đề, dialog, trang không tìm thấy và cấu hình trình bày mà không chạm đến backend, schema, xác thực Manus OAuth, dữ liệu người dùng, Telegram hoặc luồng email hiện có.

Sau khi đồng bộ, đã tách trạng thái IME của Dialog vào `dialog-composition.ts` để thành phần Dialog chỉ xuất các React component, loại bỏ cảnh báo Fast Refresh gây ra bởi hook export lẫn với component. Tiêu đề header trên thiết bị hẹp cũng được nới chiều rộng và tinh chỉnh cỡ chữ để đọc rõ thành hai dòng thay vì bị bó hẹp. Xác nhận `pnpm check`, production build và **48 kiểm thử Vitest** đều đạt. Ảnh kiểm tra desktop cùng 375×812 cho thấy giao diện mới hiển thị ổn định; header mobile, chuyển đổi ngôn ngữ, chuông và nút tạo nhanh không chồng lấn. Production build tiếp tục có cảnh báo thông tin về frontend bundle trên 500 kB nhưng vẫn hoàn tất thành công.

## Chế độ tối và tìm kiếm/lọc email

Đã kích hoạt ThemeProvider có thể chuyển đổi và lưu lựa chọn giao diện sáng/tối trên thiết bị bằng `localStorage`. Nút biểu tượng mặt trăng/mặt trời trong header chuyển đổi toàn bộ hệ token nền, bề mặt, chữ, đường viền, điều hướng, trường nhập, dialog và toast; chế độ tối vẫn giữ điểm nhấn terracotta của giao diện mới nhưng cải thiện độ tương phản khi dùng buổi tối.

Quản trị email hiện có trường tìm kiếm theo tiêu đề, người gửi hoặc nội dung trích đoạn, cùng ba bộ lọc độc lập: hộp thư, trạng thái thư và bộ lọc nhanh **Tất cả / Mới / Đã tóm tắt / Có đề xuất AI**. Lọc được thực hiện trên dữ liệu thư đã trả về trong phạm vi `userId`, không làm thay đổi dữ liệu email hoặc khiến AI quét thư tự động. Đã thêm kiểm thử `shared/emailInboxFilters.test.ts` cho phép khớp không phân biệt hoa thường, kết hợp bộ lọc và trạng thái rỗng; tổng cộng `pnpm check`, production build và **50 kiểm thử Vitest** đều đạt.

Ảnh ở 1280×720 xác nhận thanh tìm kiếm và ba bộ lọc nằm gọn trong khu vực inbox. Ảnh 375×812 xác nhận chúng xếp dọc rõ ràng, không gây cuộn ngang. Sau khi thêm nút đổi chủ đề, tiêu đề header mobile được giữ trên một dòng với ellipsis thay vì bị xuống nhiều dòng; nút menu, chuyển VI/EN, đổi chủ đề, chuông và tạo nhanh vẫn có khoảng chạm riêng. Chế độ tối được kiểm chứng qua hệ token/chuyển đổi chủ đề và build; không có hộp thư IMAP thực tế được kết nối hoặc dữ liệu email bị thay đổi trong bước kiểm chứng này.

## Phản hồi và hướng dẫn nút kết nối email

Đã xử lý việc các nút kết nối Gmail/Outlook bị vô hiệu hóa hoặc không cung cấp phản hồi rõ ràng. Nút Gmail hiện kiểm tra trường bắt buộc trước khi gọi API và hiển thị toast cùng khung hướng dẫn khi thiếu địa chỉ Gmail/mật khẩu ứng dụng hoặc khi máy chủ chưa có khóa mã hóa email. Nút Outlook luôn có thể bấm; nếu OAuth Microsoft chưa được cấu hình, ứng dụng hiển thị toast và khung hướng dẫn thay vì im lặng. Khi các cấu hình đã sẵn sàng, luồng Gmail tiếp tục kiểm tra IMAP và Outlook chuyển người dùng đến Microsoft OAuth2 như trước.

Hướng dẫn được hỗ trợ VI/EN, nêu rõ Gmail cần Xác minh 2 bước cùng Mật khẩu ứng dụng, còn Outlook cần cấu hình OAuth Microsoft một lần ở cấp máy chủ trước khi người dùng tự đăng nhập và cấp quyền IMAP. Đã thêm tiện ích `shared/emailConnectionFeedback.ts` cùng ba kiểm thử phân loại phản hồi: thiếu thông tin Gmail, thiếu khóa cấu hình Gmail và thiếu OAuth Microsoft. Xác nhận `pnpm check`, production build và **53 kiểm thử Vitest** đều đạt. Ảnh kiểm chứng 1280×720 và 375×812 xác nhận cảnh báo hiện ngay trong từng thẻ kết nối, không bị che khuất hoặc gây cuộn ngang. Không có thông tin đăng nhập, kết nối IMAP hay OAuth thật nào được tạo trong quá trình kiểm chứng.

## Webmail / IMAP SSL thay thế Outlook OAuth2

Đã thay toàn bộ lựa chọn **Outlook OAuth2** trong giao diện bằng **Webmail / IMAP SSL**, phù hợp cho email doanh nghiệp như VNPT. Biểu mẫu mới yêu cầu địa chỉ Webmail, tên đăng nhập IMAP, máy chủ IMAP SSL, cổng và mật khẩu Webmail; cổng mặc định là `993`. Hướng dẫn VI/EN nêu rõ tên máy chủ do nhà cung cấp email cấp, kết nối bắt buộc dùng SSL và mật khẩu được mã hóa trước khi lưu. Không còn nút hay lời gọi OAuth Microsoft trong Quản trị email.

Tầng dữ liệu thêm nhà cung cấp `webmail`, trường máy chủ IMAP và cổng IMAP; migration `0010_previous_imperial_guard.sql` đã được áp dụng mà không sửa dữ liệu tài khoản Gmail/Outlook hiện có. Máy chủ Webmail được kiểm tra là tên miền hợp lệ, phân giải DNS và chỉ kết nối tới địa chỉ công khai; địa chỉ IP trực tiếp, localhost, mạng riêng hoặc dải mạng đặc biệt đều bị chặn. Sau khi phân giải, kết nối TLS dùng địa chỉ công khai đã kiểm tra nhưng giữ nguyên hostname trong `servername` để xác minh chứng chỉ TLS đúng tên miền.

Đã bổ sung kiểm thử xác thực tên miền/địa chỉ Webmail, chặn mạng nội bộ, kết nối IMAP SSL và phản hồi biểu mẫu; tổng cộng `pnpm check`, production build và **57 kiểm thử Vitest** đều đạt. Ảnh kiểm chứng 1280×720 và 375×812 cho thấy hai biểu mẫu Gmail và Webmail xếp rõ ràng, trường Webmail/IMAP SSL không tràn trên điện thoại, hướng dẫn hiển thị ngay dưới nút kết nối và các khu vực Tổng quan AI, bộ lọc inbox vẫn hoạt động về bố cục. Không có mật khẩu, kết nối Webmail thực tế, đồng bộ inbox hoặc dữ liệu người dùng nào được tạo trong quá trình kiểm chứng.

## Câu nói AI hằng ngày

Đã bổ sung chế độ **Tự động / Cố định** tại hero Overview. Ở chế độ Tự động, Dashboard ưu tiên hiển thị một câu nói song ngữ được AI tạo dùng chung theo ngày lịch Việt Nam; khi chưa có câu cho ngày đó, giao diện giữ câu mặc định an toàn. Lựa chọn được lưu trên thiết bị, vì vậy người dùng có thể chuyển về câu cố định bất cứ lúc nào mà không thay đổi dữ liệu công việc hoặc lịch hẹn.

Ảnh kiểm chứng 1280×720 cho thấy công tắc nằm cạnh nhãn “Tình hình hôm nay”, câu nói, nhãn AI và các chỉ số vẫn giữ hệ lưới Swiss Design rõ ràng. Ảnh 375×812 xác nhận công tắc xếp gọn trước câu nói, nội dung không tràn ngang và các hành động nhanh tiếp tục hiển thị theo cột. Đã xác nhận `pnpm check`, production build và **61 kiểm thử Vitest** đều đạt. Lịch Heartbeat sẽ tạo duy nhất một câu mỗi ngày sau khi phiên bản có handler được xuất bản; prompt chỉ yêu cầu câu nói chung và không gửi email, công việc hoặc thông tin cá nhân đến AI.

Checkpoint `9d9c293e` đã được xuất bản trước khi đăng ký lịch chạy nền. Heartbeat dự án `daily-ai-quote` đang bật với `task_uid` được lưu an toàn trong bảng `scheduled_jobs`; lịch `0 5 17 * * *` theo UTC tương ứng **00:05 mỗi ngày giờ Việt Nam**. Handler chỉ chấp nhận task UID đã đăng ký và dịch vụ tạo câu có tính idempotent theo ngày, nên một lần gọi lại không thể tạo nhiều câu cho cùng một ngày. Tại thời điểm xác minh, job chưa đến lần chạy đầu tiên nên lịch sử thực thi còn trống.

## Khắc phục trạng thái Webmail / IMAP SSL

Thông báo **“Webmail chưa sẵn sàng trên máy chủ này”** được xác định do thiếu biến bí mật `EMAIL_TOKEN_ENCRYPTION_KEY`, vốn bắt buộc để mã hóa AES-256-GCM mật khẩu IMAP trước khi lưu. Sau khi người dùng thêm khóa base64 32 byte trong cấu hình dự án và dịch vụ được khởi động lại, môi trường máy chủ xác nhận khóa có độ dài hợp lệ. Kiểm thử mới xác nhận truy vấn cấu hình trả về Gmail và Webmail đều sẵn sàng khi khóa hợp lệ; toàn bộ `pnpm test` đạt **62 kiểm thử**, cùng với `pnpm check` và production build thành công. Không đọc, ghi, hoặc hiển thị lại giá trị bí mật trong quá trình kiểm chứng.

## Chuẩn hóa biểu mẫu Gmail / IMAP SSL

Biểu mẫu Gmail nay dùng cấu trúc nhất quán với Webmail / IMAP SSL: địa chỉ Gmail, tên đăng nhập IMAP tùy chọn, máy chủ `imap.gmail.com` và cổng SSL `993` được hiển thị cố định, cùng trường **Mật khẩu ứng dụng Google**. Mật khẩu đăng nhập Google thông thường không được chấp nhận; giao diện nêu rõ yêu cầu Mật khẩu ứng dụng 16 ký tự và vẫn giữ toàn bộ hướng dẫn VI/EN. Ảnh xem trước desktop 1280×720 và mobile 375×812 xác nhận shell Dashboard, chuyển đổi ngôn ngữ, thông báo, nút tạo nhanh và các khối nội dung giữ bố cục ổn định, không có tràn ngang. Phần biểu mẫu được kiểm chứng bằng kiểm tra kiểu, build production và **62 kiểm thử Vitest**; không dùng thông tin đăng nhập Gmail thực tế trong lần xác minh này.

## Biểu mẫu đăng nhập email thu gọn

Hai thẻ Gmail và Webmail / IMAP SSL nay được thu gọn mặc định. Mỗi thẻ có biểu tượng bánh răng riêng; người dùng bấm biểu tượng này để mở hoặc đóng trường thông tin đăng nhập và hướng dẫn kết nối. Nút có `aria-label`, `title` và vòng focus hiển thị rõ, nên có thể dùng bằng chuột, chạm hoặc bàn phím. Nội dung đăng nhập chỉ được render khi thẻ được mở; không thay đổi luồng IMAP, trạng thái cấu hình hay dữ liệu mật khẩu đang được mã hóa phía máy chủ.

Đã xác nhận `pnpm check`, production build và **62 kiểm thử Vitest** đều đạt. Ảnh xem trước tại 1280×720 và 375×812 xác nhận shell ứng dụng tiếp tục ổn định, không tràn ngang hoặc làm chồng lấn header/navigation. Không nhập thông tin đăng nhập, tạo kết nối IMAP hoặc thay đổi dữ liệu email trong bước kiểm chứng này.

## Tóm tắt AI và trạng thái Đã đọc trong Inbox

Khi người dùng chủ động bấm **Tóm tắt bằng Gemini** ở bất kỳ thư đã đồng bộ nào, TaskFlow giữ hộp xác nhận quyền riêng tư, tạo hoặc dùng lại bản tóm tắt và chỉ sau khi thành công mới cập nhật thư đó thành **Đã đọc** trong phạm vi `userId`. Trạng thái này đồng thời đặt `isRead` và trạng thái nghiệp vụ `done`, vì vậy thư không còn được tính là email Mới trong chuông thông báo. Mỗi email có tóm tắt hiển thị khối nội dung Gemini ngay trong dòng thư; AI không tự quét Inbox và chỉ gửi tiêu đề, người gửi cùng phần xem trước của thư người dùng chọn.

Ảnh xem trước ở 1280×720 và 375×812 xác nhận vùng Inbox, thanh lọc và các dòng thư vẫn xếp dọc rõ ràng, không bị tràn ngang. Bộ lọc nhanh bổ sung mục **Đã đọc** để xem lại các thư đã chuyển trạng thái. Do phiên kiểm chứng không tạo yêu cầu Gemini hay thay đổi dữ liệu email thực, luồng kết quả được xác nhận bằng router/unit test: cả tóm tắt mới và tóm tắt đã lưu đều gọi cập nhật Đã đọc đúng `userId`/`messageId`. `pnpm check`, production build và **63 kiểm thử Vitest** đều đạt.

## Hộp thoại chi tiết tóm tắt AI

Danh sách Inbox nay không còn mở rộng nội dung Gemini ngay bên trong từng dòng email. Với thư đã có bản tóm tắt, người dùng bấm **Xem tóm tắt AI** để mở hộp thoại chi tiết; hộp thoại hiển thị tiêu đề, người gửi, thời điểm nhận, nội dung tóm tắt và lưu ý về giới hạn dữ liệu đã xử lý. Dialog dùng thành phần truy cập được có sẵn của ứng dụng, vì vậy hỗ trợ nút đóng, phím Escape, focus trap và cuộn nội dung khi bản tóm tắt dài.

Ảnh xem trước Overview desktop 1280×720 và Email manager desktop xác nhận shell ứng dụng cùng danh sách Inbox tiếp tục ổn định sau thay đổi, không có khối tóm tắt dài chen vào các hàng thư. Do môi trường kiểm chứng không gửi thư thật tới Gemini, thao tác mở dialog được xác nhận qua state cục bộ có điều kiện và build/typecheck; `pnpm check`, production build và **63 kiểm thử Vitest** đều đạt.

## Khắc phục lỗi Gemini HTTP 404

Lỗi tóm tắt được tái hiện bằng yêu cầu tối thiểu tới Gemini API với khóa máy chủ đang cấu hình. Phản hồi `404` nêu rõ `gemini-2.5-flash-lite` không còn khả dụng cho người dùng API mới và đề nghị dùng `gemini-3.5-flash-lite`. Dịch vụ tóm tắt đã được chuyển sang model đề nghị này, vẫn chỉ gửi metadata và preview của email mà người dùng chủ động chọn.

Yêu cầu tạo nội dung tối thiểu với `gemini-3.5-flash-lite` đã phản hồi HTTP `200` cùng nội dung `ok`; không có email hoặc dữ liệu người dùng nào được gửi trong kiểm chứng. Kiểm thử bổ sung xác nhận URL yêu cầu luôn dùng model cấu hình mới. Toàn bộ `pnpm check`, production build và **63 kiểm thử Vitest** đều đạt.

## Thao tác mở rộng trong popup tóm tắt AI

Popup tóm tắt nay có ba thao tác. **Sao chép tóm tắt** dùng clipboard của trình duyệt và thông báo kết quả rõ ràng; **Mở email gốc** chỉ mở liên kết web có sẵn của thư, hoặc báo không có liên kết; **Tạo lịch hẹn từ tóm tắt** chỉ tạo một bản nháp trong EventDialog gồm tiêu đề email, tóm tắt, người gửi và liên kết gốc. Người dùng vẫn phải chọn thời gian/chỉnh sửa và xác nhận lưu, nên hệ thống không tự tạo lịch hẹn từ AI.

Đã thêm kiểm thử `eventPrefillFromEmailSummary` cho bản nháp lịch hẹn và xác nhận `pnpm check`, production build cùng **64 kiểm thử Vitest** đều đạt. Ảnh Overview tại 1280×720 và 375×812 xác nhận shell desktop/mobile vẫn không tràn ngang sau khi bổ sung logic popup. Không có thao tác clipboard, liên kết email thật hoặc lịch hẹn nào được kích hoạt trong bước kiểm chứng trực quan.
