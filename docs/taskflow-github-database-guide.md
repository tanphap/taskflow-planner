# TaskFlow Planner: Kiến trúc, GitHub, Database và triển khai riêng

**Mục đích.** Tài liệu này giải thích theo cách thực hành cách TaskFlow Planner liên kết giữa giao diện, backend, database, Telegram, GitHub và môi trường triển khai. Tài liệu được viết theo cấu trúc dự án hiện tại: **React + Express/tRPC + Drizzle ORM + MySQL/TiDB + Manus OAuth + Telegram Bot**.

> **Nguyên tắc quan trọng:** GitHub lưu **mã nguồn**. Database lưu **dữ liệu thật của người dùng**. Secrets lưu trong **trình quản lý biến môi trường**. Ba nơi này không thay thế cho nhau và không nên trộn lẫn.

## 1. Sơ đồ đơn giản của TaskFlow

```mermaid
flowchart LR
    U[Người dùng<br/>Điện thoại / Máy tính] --> FE[Frontend React<br/>client/src]
    FE -->|Đăng nhập| OAUTH[Manus OAuth]
    FE -->|API tRPC đã xác thực| BE[Backend Express + tRPC<br/>server]
    BE -->|Drizzle ORM + DATABASE_URL| DB[(MySQL / TiDB<br/>Công việc, lịch hẹn, hồ sơ)]
    BE -->|Bot token| TG[Telegram Bot API]
    SCH[Bộ lập lịch Heartbeat<br/>nhắc Telegram] -->|Gọi endpoint nhắc| BE
    GH[GitHub private repository<br/>Mã nguồn + migrations] -.->|source code only| BE
    S3[S3 / Object storage<br/>Tệp, ảnh nếu có] <--> BE
```

| Phần | Vai trò trong TaskFlow | Ví dụ dữ liệu hoặc tệp |
|---|---|---|
| **Frontend** | Hiển thị màn hình Công việc, Lịch hẹn, Nhắc việc, Hồ sơ. | Mã React trong `client/src/`. |
| **Backend** | Xác thực OAuth, kiểm tra `userId`, đọc/ghi dữ liệu, gửi Telegram. | Mã trong `server/`. |
| **Database** | Nguồn dữ liệu thật của ứng dụng. | Công việc, lịch hẹn, lịch sử Telegram, thông báo. |
| **GitHub** | Lưu lịch sử mã, review thay đổi, cộng tác. | `client/`, `server/`, `drizzle/`, tests. |
| **Secrets** | Chứa khóa riêng phục vụ runtime. | `DATABASE_URL`, `JWT_SECRET`, Telegram token. |
| **Telegram** | Kênh nhận nhắc lịch hẹn. | Chat ID/liên kết người dùng và Bot API token. |

Luồng tạo lịch hẹn hoạt động như sau: người dùng thao tác ở frontend, frontend gọi thủ tục tRPC, backend xác nhận phiên OAuth và áp điều kiện theo `userId`, sau đó backend mới ghi vào database. Vì vậy, giao diện trình duyệt **không có quyền truy cập database trực tiếp**.

Sơ đồ trên cũng đã được kết xuất thành tệp `taskflow-architecture-diagram.png` để có thể xem độc lập ngoài trình đọc Mermaid.

## 2. GitHub có làm mất hoặc lộ database không?

Không. Khi xuất TaskFlow lên GitHub, repository chỉ nên có **mã nguồn, migration database và tài liệu**. Các bản ghi như tên công việc, lịch hẹn, lịch sử Telegram, email người dùng và mật khẩu **không được xuất thành mã nguồn**.

Tệp `.gitignore` hiện tại đã bỏ qua `.env`, `.env.local`, các tệp build, log và database cục bộ. Tuy nhiên, `.gitignore` chỉ bảo vệ các tệp **chưa từng bị commit**. Nếu một token đã bị đưa lên GitHub một lần, cần thu hồi/đổi token ngay cả khi đã xóa dòng đó ở commit sau.

| Nội dung | Có nên đưa vào GitHub? | Cách xử lý đúng |
|---|---:|---|
| `client/src`, `server`, `drizzle`, tests | Có | Commit vào repository private. |
| `drizzle/migrations/*.sql` | Có | Giúp các môi trường tạo đúng schema. |
| `.env`, `.env.production`, token Bot | Không | Lưu trong Secrets của nền tảng deploy. |
| `DATABASE_URL` thật | Không | Chỉ đặt trên server hoặc Secret Manager. |
| Dữ liệu công việc/lịch hẹn thật | Không | Backup/export riêng từ database khi cần. |
| File ảnh/tệp dung lượng lớn | Không nên | Lưu ở S3/object storage và chỉ lưu URL/khóa tham chiếu. |

## 3. Xuất TaskFlow từ Manus sang GitHub an toàn

### Bước 1 — Chuẩn bị repository

Trong bảng quản lý dự án, mở **Settings → GitHub**. Kết nối tài khoản GitHub nếu hệ thống yêu cầu, sau đó tạo hoặc chọn repository mới. Với TaskFlow cá nhân, chọn **Private** để source code và lịch sử phát triển không công khai.

Tên repository gợi ý: `taskflow-planner`. Không đặt mật khẩu, token, chat ID Telegram hoặc chuỗi kết nối database vào tên repository, README công khai hay phần mô tả repository.

### Bước 2 — Kiểm tra trước khi xuất

Trước khi xuất, kiểm tra các điều kiện sau.

| Kiểm tra | Kết quả cần có |
|---|---|
| `.env` và `.env.*` | Có trong `.gitignore`; không hiển thị trong thay đổi cần commit. |
| Telegram | Chỉ sử dụng `TELEGRAM_BOT_TOKEN` qua biến môi trường; không ghi token trực tiếp trong mã. |
| Database | Chỉ đọc `DATABASE_URL` từ biến môi trường; không ghi URL thật trong mã hoặc tài liệu. |
| Source code | Không có file `.pem`, `.key`, file backup database, export CSV dữ liệu người dùng. |
| Repository | Đặt chế độ private và chỉ mời collaborator cần thiết. |

Sau đó bấm **Export to GitHub**. GitHub nhận mã nguồn; ứng dụng TaskFlow đang chạy và database hiện tại không bị xóa hay tự động chuyển sang GitHub.

### Bước 3 — Làm việc với AI/developer khác

Nếu người khác chỉ chỉnh giao diện, giới hạn phạm vi ở `client/src/` và `client/src/index.css`. Thay đổi này không đòi hỏi sửa database.

Nếu thay đổi liên quan `server/`, `drizzle/schema.ts`, hoặc `drizzle/migrations/`, yêu cầu họ mô tả rõ:

1. Bảng/cột nào thay đổi và lý do.
2. Migration SQL nào được tạo.
3. Cách rollback hoặc phục hồi nếu migration thất bại.
4. Test nào đã chạy.

Không cấp quyền Administrator cho collaborator chỉ cần chỉnh giao diện. Dùng branch riêng và Pull Request để xem thay đổi trước khi merge. GitHub có hướng dẫn về repository private, quyền collaborator và cơ chế phát hiện secrets tại [GitHub Docs](https://docs.github.com/).

### Bước 4 — Nếu lỡ đưa secret lên GitHub

1. **Thu hồi hoặc đổi secret ngay**, đặc biệt là Telegram Bot token và mật khẩu database.
2. Thay giá trị mới trong Secrets của môi trường đang chạy.
3. Xóa secret khỏi source code và commit mới.
4. Kiểm tra lịch sử commit; với repository đã chia sẻ, cân nhắc dùng công cụ lọc lịch sử Git theo hướng dẫn của GitHub.
5. Kiểm tra log Telegram/database để phát hiện hành vi bất thường.

> Không xem việc xóa token khỏi commit mới là đủ an toàn. Token có thể vẫn tồn tại trong lịch sử Git, bản clone của collaborator hoặc cache CI.

## 4. Database thực tế của TaskFlow

TaskFlow hiện dùng Drizzle ORM với database tương thích **MySQL/TiDB**. Schema được định nghĩa trong `drizzle/schema.ts`; migration được lưu trong `drizzle/migrations/`. Dữ liệu thật không nằm trong các file schema/migration đó.

Các bảng nghiệp vụ chính gồm người dùng, công việc, lịch hẹn, nhắc việc, kết nối Telegram và lịch sử giao nhận Telegram. Backend luôn truy vấn theo người dùng đã đăng nhập; khi viết chức năng mới, mọi truy vấn danh sách, sửa hoặc xóa cần tiếp tục lọc theo `userId`.

### Chuỗi kết nối database

Trên server riêng, đặt `DATABASE_URL` trong Secret Manager hoặc phần Environment Variables của nền tảng deploy. Ví dụ minh họa, **không dùng giá trị này thật**:

```dotenv
DATABASE_URL=mysql://taskflow_app:URL_ENCODED_PASSWORD@db.example.net:3306/taskflow
```

Nếu nhà cung cấp database yêu cầu TLS/SSL, bật TLS theo đúng tài liệu của họ. Không tắt xác thực chứng chỉ chỉ để xử lý lỗi kết nối. Tạo riêng một user database, ví dụ `taskflow_app`; không dùng tài khoản root cho website.

| Môi trường | Database nên dùng | Nguyên tắc |
|---|---|---|
| Local development | MySQL/TiDB local hoặc database dev riêng | Không dùng database production. |
| Staging | Database staging riêng | Kiểm tra migration trước production. |
| Production | Managed MySQL/TiDB có backup và TLS | Quyền tối thiểu, monitoring, backup định kỳ. |

### Migration an toàn

Khi thêm cột/bảng mới, quy trình nên là:

1. Sửa schema Drizzle trong branch phát triển.
2. Chạy `pnpm drizzle-kit generate` để tạo migration.
3. Đọc kỹ file SQL sinh ra, nhất là lệnh `DROP`, đổi kiểu dữ liệu hoặc thêm cột bắt buộc.
4. Chạy test và thử migration ở database staging.
5. Backup database production.
6. Chạy `pnpm drizzle-kit migrate` với `DATABASE_URL` production được cấu hình trong môi trường an toàn.
7. Kiểm tra log ứng dụng và số bản ghi quan trọng sau migration.

Với dữ liệu lớn, không thực hiện một migration khóa bảng trong giờ cao điểm. Chia migration thành bước tương thích ngược: thêm cột nullable, deploy code mới, backfill theo lô, rồi mới thêm ràng buộc khi dữ liệu đã sẵn sàng.

## 5. Cấu hình biến môi trường khi triển khai server riêng

File `server/_core/env.ts` của dự án đọc các biến môi trường sau. Không commit file `.env` production vào GitHub.

| Biến | Bắt buộc | Dùng cho | Lưu ý bảo mật |
|---|---:|---|---|
| `NODE_ENV` | Có | Chuyển ứng dụng sang chế độ production. | Đặt `production`. |
| `PORT` | Có | Cổng ứng dụng lắng nghe. | Nền tảng cloud thường cấp sẵn. |
| `DATABASE_URL` | Có | Kết nối MySQL/TiDB. | Secret, không đưa vào client. |
| `JWT_SECRET` | Có | Ký/xác thực cookie phiên. | Chuỗi ngẫu nhiên dài, đổi riêng cho production. |
| `VITE_APP_ID` | Có nếu dùng Manus OAuth | Định danh ứng dụng OAuth. | Không chứa token riêng, nhưng quản lý qua env. |
| `OAUTH_SERVER_URL` | Có nếu dùng Manus OAuth | Máy chủ OAuth. | Phải khớp cấu hình OAuth. |
| `VITE_OAUTH_PORTAL_URL` | Có nếu frontend dùng cổng Manus OAuth | Điểm bắt đầu đăng nhập. | Phải dùng HTTPS production. |
| `TELEGRAM_BOT_TOKEN` | Có nếu gửi Telegram | Gọi Telegram Bot API. | Secret; thu hồi ngay nếu lộ. |
| `OWNER_OPEN_ID` | Tùy cấu hình OAuth | Thông tin chủ dự án. | Không dùng để thay thế phân quyền. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Chỉ khi dùng dịch vụ tích hợp Manus | Các proxy/tích hợp có sẵn của Manus. | Có thể không dùng được ngoài Manus. |

Ví dụ file `.env.example` để commit lên GitHub, chỉ có **tên biến và giá trị giả**:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://taskflow_app:REPLACE_ME@db.example.net:3306/taskflow
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
VITE_APP_ID=YOUR_OAUTH_APP_ID
OAUTH_SERVER_URL=https://YOUR_OAUTH_SERVER
VITE_OAUTH_PORTAL_URL=https://YOUR_OAUTH_PORTAL
TELEGRAM_BOT_TOKEN=REPLACE_WITH_TELEGRAM_BOT_TOKEN
```

Mỗi nền tảng có màn hình riêng để nhập các biến này: Render, Railway, Fly.io, AWS, Google Cloud, VPS với Docker Compose hoặc Kubernetes. Giá trị phải được đặt ở **server-side environment**, không gửi vào mã React trừ những biến thật sự công khai cần hiển thị ở build time.

## 6. Đưa TaskFlow lên server riêng: lộ trình thực tế

### Phương án khuyến nghị

Chọn một nền tảng có ba thành phần: hosting Node.js, managed MySQL-compatible database và Secret Manager. Dùng database staging trước, sau đó mới chuyển production. Khi đang vận hành ổn định trên Manus, không xóa database cũ cho tới khi website ở server mới chạy ổn và backup đã được kiểm tra.

### Các bước triển khai

1. **Tạo database production mới** và user quyền tối thiểu; bật backup và TLS.
2. **Đưa source lên GitHub private** theo phần 3.
3. **Clone/deploy repository** ở hosting Node.js.
4. **Thiết lập Environment Variables** trong dashboard hosting; không upload file `.env` qua Git.
5. **Đăng ký domain production mới** trong cấu hình OAuth, bao gồm callback URL HTTPS. Nếu callback URL chưa được cho phép, đăng nhập sẽ thất bại.
6. **Áp migration** vào database mới theo phần 4. Nếu cần dữ liệu cũ, xuất/nhập database bằng công cụ DB được cấp quyền, không dùng GitHub làm công cụ chuyển dữ liệu.
7. Chạy `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`, rồi khởi động bằng `pnpm start` với `NODE_ENV=production`.
8. Đặt reverse proxy/load balancer HTTPS ở phía trước ứng dụng nếu hosting không tự cung cấp TLS.
9. Kiểm tra các luồng: OAuth, tạo công việc, tạo lịch hẹn, tách dữ liệu hai tài khoản, Telegram và lịch sử gửi.

### Lưu ý về Telegram và tác vụ định kỳ

Phiên bản hiện tại dùng hạ tầng Heartbeat của Manus để gọi endpoint gửi nhắc Telegram. Nếu chuyển hoàn toàn ra server riêng, bạn cần thay phần lập lịch này bằng một scheduler riêng, chẳng hạn worker/cron của nhà cung cấp hosting hoặc hàng đợi tác vụ. Scheduler phải gọi endpoint có xác thực, lưu trạng thái gửi và duy trì cơ chế chống gửi trùng. Không dùng cron chạy trong một web server autoscale nếu nhà cung cấp có thể tắt instance khi không có truy cập.

## 7. Khi database lớn dần

Database lớn không được xử lý bằng cách đưa dữ liệu vào GitHub. Cần vận hành theo các nguyên tắc sau.

| Nhu cầu | Hướng xử lý thực tế |
|---|---|
| Danh sách công việc/lịch hẹn dài | Phân trang, lọc theo thời gian/trạng thái, chỉ tải trường cần thiết. |
| Truy vấn chậm | Thêm index dựa trên truy vấn thực tế, ví dụ kết hợp `userId` với ngày hoặc trạng thái. |
| Log Telegram tăng nhanh | Có chính sách lưu giữ; lưu log gần đây trong database và archive/xóa có kiểm soát. |
| Ảnh/tệp đính kèm | Lưu object storage; database chỉ lưu metadata và URL/key. |
| Mất dữ liệu/sự cố | Backup định kỳ, thử khôi phục backup và theo dõi lỗi/migration. |
| Nhiều người dùng | Dùng managed database có thể tăng tài nguyên, connection pooling và giám sát. |

## 8. Checklist trước khi chuyển môi trường

| Hạng mục | Hoàn tất khi |
|---|---|
| Repository | Private, `.env` không bị commit, quyền collaborator tối thiểu. |
| Secrets | Tất cả secret nằm trong dashboard server/Secret Manager; token cũ đã xoay nếu từng lộ. |
| Database | Có database production, backup và tài khoản app riêng. |
| Migrations | Đã thử ở staging, đã backup trước khi chạy production. |
| OAuth | Redirect URI HTTPS của domain mới đã đăng ký và kiểm tra đăng nhập thành công. |
| Telegram | Bot token được cấu hình, scheduler mới có xác thực và chống gửi trùng. |
| Kiểm thử | Kiểm tra tách dữ liệu theo tài khoản, CRUD, lịch hẹn, nhắc việc và giao diện mobile. |
| Rollback | Có bản release trước, backup DB và cách quay lại nếu lỗi. |

## 9. Kết luận ngắn

Bạn có thể xuất TaskFlow lên GitHub mà không ảnh hưởng đến database đang chạy. GitHub là nơi cộng tác mã nguồn; database và secrets phải được quản lý riêng. Nếu chuyển sang server riêng, phần cần chuẩn bị kỹ nhất là **database mới/backup/migration**, **OAuth callback URL**, **secrets**, và **scheduler thay cho Heartbeat Manus**.

Đối với thay đổi giao diện, có thể để AI/developer làm trong `client/src/` mà không đụng database. Với thay đổi schema, luôn yêu cầu migration, test và kế hoạch rollback trước khi deploy.
