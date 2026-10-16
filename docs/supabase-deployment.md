# Chuẩn bị Supabase cho TaskFlow

**Mục tiêu.** Tài liệu này hướng dẫn cách chuẩn bị một Supabase project cho TaskFlow, lấy thông tin kết nối, kiểm tra database đã sẵn sàng, và lập kế hoạch migrate dữ liệu an toàn trước khi đổi traffic.

> **Nguyên tắc bảo mật**
>
> - Không gửi **database password**, **service-role key** hoặc **database URL** production vào chat.
> - Chỉ dán secret vào dashboard của Supabase hoặc dashboard deploy như Railway.
> - Không commit secret vào GitHub, kể cả trong `.env`, README hay ảnh chụp màn hình.

## 1. Trạng thái hiện tại của repository

Hiện tại repository này **chưa chạy Supabase/PostgreSQL ở production**.

- `/home/runner/work/taskflow-planner/taskflow-planner/server/_core/env.ts` đọc `DATABASE_URL` và các biến OAuth hiện tại.
- `/home/runner/work/taskflow-planner/taskflow-planner/server/db.ts` khởi tạo Drizzle bằng `drizzle-orm/mysql2`.
- `/home/runner/work/taskflow-planner/taskflow-planner/drizzle.config.ts` đang đặt `dialect: "mysql"`.
- `/home/runner/work/taskflow-planner/taskflow-planner/server/_core/oauth.ts` vẫn đăng nhập qua Manus OAuth và lưu người dùng theo `openId`.
- `/home/runner/work/taskflow-planner/taskflow-planner/drizzle/schema.ts` định nghĩa bảng `users` dựa trên `openId`, chưa ánh xạ sang Supabase Auth UUID.

Vì vậy, **không nên** lấy PostgreSQL URL của Supabase dán thẳng vào `DATABASE_URL` của app hiện tại. Cần chuẩn bị schema PostgreSQL, migration dữ liệu và kế hoạch chuyển auth trước khi cutover.

## 2. A — Tạo Supabase project

1. Mở **Supabase Dashboard**.
2. Bấm **New project**.
3. Chọn **organization**.
4. Nhập **project name**.
5. Chọn **region** gần nơi backend Railway sẽ chạy.
6. Đặt **database password** mạnh và lưu vào password manager của bạn.
7. Bấm **Create new project**.

### Gợi ý chọn region

- Nếu Railway chạy ở Singapore, ưu tiên region châu Á gần nhất.
- Nếu Railway chạy ở US hoặc EU, chọn region Supabase cùng khu vực để giảm độ trễ.
- Không chọn region ngẫu nhiên chỉ vì rẻ hơn nếu backend chính ở nơi khác.

## 3. B — Lấy thông tin database và API

Sau khi project tạo xong:

1. Vào **Project Settings → Database**.
2. Ghi lại:
   - host
   - port
   - database name
   - user
   - password
   - connection string
3. Lưu các giá trị này ở nơi an toàn. Không gửi chúng qua chat.

Nếu cần xem thông tin API:

1. Vào **Project Settings → API**.
2. Ở đây bạn sẽ thấy:
   - project URL
   - anon key
   - service-role key

> **Lưu ý**
>
> - `service_role` là secret có quyền cao, không đưa vào client.
> - `anon` key không phải quyền quản trị, nhưng vẫn nên quản lý qua env khi app đã hỗ trợ Supabase.
> - Với trạng thái code hiện tại, bạn **chưa cần** cấu hình `service_role` để chỉ chuẩn bị database.

## 4. C — Kiểm tra database đã sẵn sàng

1. Vào **SQL Editor**.
2. Tạo một query mới.
3. Chạy:

```sql
select now();
select current_database();
```

Nếu cả hai câu lệnh trả về kết quả, project đã sẵn sàng để nhận schema và dữ liệu.

## 5. Nếu mới chỉ muốn chuẩn bị database

Khi mục tiêu hiện tại chỉ là chuẩn bị Supabase trước:

- Có thể giữ project mới ở trạng thái mặc định.
- Chưa cần bật hoặc cấu hình sâu trong **Auth**.
- Chưa cần dùng `service_role` key.
- Chưa cần tạo bảng thủ công nếu bạn muốn schema được tạo từ migration phù hợp với codebase.
- Chưa nên đổi `DATABASE_URL` của môi trường production sang URL Postgres của Supabase.

## 6. Chỗ thao tác nào trong Supabase dùng để làm gì

| Khu vực | Dùng để làm gì |
|---|---|
| **SQL Editor** | Chạy SQL, tạo schema, kiểm tra dữ liệu, đối chiếu số lượng bản ghi |
| **Table Editor** | Xem/sửa dữ liệu dạng bảng khi cần kiểm tra nhanh |
| **Database → Extensions** | Bật extension PostgreSQL khi thật sự cần |
| **Project Settings → Database** | Lấy connection string và cấu hình database |
| **Project Settings → API** | Xem project URL, anon key, service-role key |
| **Auth → Users** | Tạo user test và theo dõi user đăng nhập khi ứng dụng đã chuyển sang Supabase Auth |

## 7. Về Supabase Auth trong repo này

Supabase Auth có thể được dùng sau này, nhưng **không nên bật cutover auth trước khi code được đổi**.

Lý do:

1. App hiện tại vẫn tạo phiên từ Manus OAuth.
2. User hiện tại đang được nhận diện bằng `users.openId`.
3. Supabase Auth sẽ dùng UUID riêng cho người dùng.
4. Cần có bước ánh xạ giữa tài khoản cũ và UUID mới trước khi chuyển traffic.

Nếu muốn thử trước:

1. Vào **Auth → Users**.
2. Tạo một user test.
3. Chỉ dùng cho kiểm tra thủ công ở dashboard.

Không coi bước này là hoàn tất migration auth cho ứng dụng.

## 8. Trình tự migrate dữ liệu an toàn

Nếu mục tiêu là chuyển dần từ MySQL/TiDB hiện tại sang Supabase PostgreSQL, thứ tự an toàn là:

1. Tạo Supabase project.
2. Tạo schema PostgreSQL tương ứng.
3. Backup MySQL/TiDB nguồn.
4. Export dữ liệu từ nguồn.
5. Import dữ liệu vào Supabase PostgreSQL.
6. Đối chiếu số lượng bản ghi và dữ liệu quan trọng.
7. Ánh xạ `users.openId` hiện có sang **Supabase Auth UUID**.
8. Kiểm thử đăng nhập, API và các luồng nghiệp vụ.
9. Chỉ khi mọi thứ đúng mới chuyển traffic.

## 9. Checklist cutover trước khi đổi traffic

Trước khi chuyển production sang Supabase, hãy bảo đảm:

- Đã backup database nguồn và thử restore được.
- Đã tạo schema PostgreSQL đúng với application model.
- Đã import đủ dữ liệu nghiệp vụ.
- Đã đối chiếu ít nhất các bảng quan trọng như:
  - `users`
  - `tasks`
  - `calendar_events`
  - `notifications`
  - `telegram_connections`
  - `telegram_delivery_logs`
- Đã có kế hoạch ánh xạ `openId` sang Supabase Auth UUID.
- Đã kiểm tra đăng nhập, CRUD, lịch hẹn, nhắc Telegram và phân tách dữ liệu giữa các tài khoản.
- Đã chuẩn bị rollback về database cũ nếu có lỗi.

## 10. Không nên làm gì ở giai đoạn này

Không nên:

- dán Postgres URL của Supabase vào app hiện tại rồi deploy ngay;
- bỏ qua bước backup trước khi import hoặc cutover;
- bật Supabase Auth production trước khi đổi luồng đăng nhập trong code;
- gửi password, service-role key hoặc database URL production trong chat;
- xóa database MySQL/TiDB cũ trước khi hoàn tất kiểm thử và rollback window.

## 11. Bước tiếp theo trong repository

Sau khi project Supabase đã được tạo và database sẵn sàng, phần việc còn lại trong repository là:

1. chuyển Drizzle/schema từ MySQL sang PostgreSQL-compatible schema;
2. chuẩn bị migration tạo schema cho Supabase;
3. lập kế hoạch import dữ liệu;
4. đổi luồng xác thực từ Manus OAuth sang Supabase Auth;
5. ánh xạ tài khoản hiện có từ `openId` sang Supabase Auth UUID;
6. cập nhật cấu hình deploy trên Railway sau khi code đã sẵn sàng.

Tài liệu này chỉ bao phủ phần **chuẩn bị Supabase project và cutover an toàn**. Nó không có nghĩa là application hiện tại đã sẵn sàng chạy trực tiếp trên Supabase.
