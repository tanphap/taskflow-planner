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
