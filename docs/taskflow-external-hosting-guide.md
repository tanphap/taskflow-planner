# Triển khai TaskFlow ngoài Manus: VPS, Render và Vercel

**Tác giả:** Manus AI  
**Cập nhật:** 19/08/2026

## 1. Kết luận trước khi bắt đầu

TaskFlow hiện chạy tốt nhất trên hosting Manus vì được cấp sẵn database, Manus OAuth, secret và Heartbeat cho lịch Telegram. GitHub chỉ lưu **mã nguồn**; database và secrets không tự đi cùng khi chuyển host.

Nếu mục tiêu là một ứng dụng thật cho nhiều người dùng, phương án ít thay đổi nhất là **Render Web Service trả phí hoặc VPS có HTTPS**, kết nối đến database MySQL/TiDB quản lý riêng. Vercel có thể chạy Express, nhưng TaskFlow phải được sửa để phù hợp mô hình function và phải thay thế hệ thống Heartbeat. [1] [2]

> Không nên dùng gói miễn phí như môi trường production cho lịch nhắc Telegram. Render ghi rõ Free Web Service ngủ sau 15 phút không có traffic, filesystem không bền vững và không khuyến nghị dùng Free instance cho production. Free Postgres cũng hết hạn sau 30 ngày, không có backup, và không tương thích trực tiếp với schema MySQL/TiDB hiện tại. [3]

| Lựa chọn | Phù hợp cho TaskFlow hiện tại | Cần thay đổi | Khuyến nghị |
|---|---|---|---|
| **Manus hiện tại** | Có, nguyên trạng | Không | Tốt nhất nếu muốn vận hành đơn giản |
| **Render Web Service + MySQL/TiDB ngoài** | Có | Thay Manus OAuth/Heartbeat, cấu hình secrets | Phù hợp để bắt đầu host ngoài |
| **VPS Linux + Node + Nginx** | Có | Thay Manus OAuth/Heartbeat, tự vận hành bảo mật/backup | Phù hợp khi cần quyền kiểm soát cao |
| **Vercel** | Có nhưng không nguyên trạng | Chuyển entry Express sang function, tách static build, thay Heartbeat bằng cron | Chỉ nên chọn nếu quen serverless |
| **Render Free** | Chỉ demo/test | Như trên, thêm cold start và giới hạn free | Không dùng cho lịch nhắc thực tế |

## 2. Những thành phần phải chuyển khi rời Manus

TaskFlow hiện gồm React frontend, Express/tRPC backend, Drizzle với MySQL/TiDB, Manus OAuth, Telegram Bot và Manus Heartbeat. Khi đưa code lên host khác, chỉ React/Express/Drizzle/Telegram Bot là có thể mang nguyên logic tương đối dễ dàng. Ba phần sau cần kế hoạch thay thế:

| Phụ thuộc hiện tại | Vì sao không tự mang theo được | Cách thay thế ngoài Manus |
|---|---|---|
| **Manus OAuth** | Dùng `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` và SDK nội bộ | Dùng OAuth riêng, ví dụ Google/GitHub/Email provider, hoặc xác nhận với Manus về quyền dùng OAuth trên domain ngoài |
| **Heartbeat** | Dùng `BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY` để tạo job | VPS: cron/systemd; Render: Cron Job; Vercel: Vercel Cron hoặc hàng đợi bên ngoài |
| **Built-in Forge/Storage** | Các key được hệ thống hiện tại tự cấp | Dùng S3/R2 hoặc dịch vụ API riêng nếu sau này có upload/AI |

Telegram Bot API không bị khóa vào Manus, nhưng `TELEGRAM_BOT_TOKEN` phải được đặt lại trong secrets của host mới, không được ghi vào GitHub.

## 3. Chuẩn bị an toàn trên GitHub

Hãy tạo repository **Private**. Kiểm tra `.gitignore` có `.env`, `.env.*`, `node_modules`, `dist` và file dữ liệu cục bộ. Chỉ commit file mẫu không có giá trị thật, ví dụ `.env.example`:

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/taskflow
JWT_SECRET=replace-with-a-long-random-secret
TELEGRAM_BOT_TOKEN=replace-in-host-dashboard-only
APP_ORIGIN=https://taskflow.example.com
CRON_SECRET=replace-with-a-separate-long-random-secret
```

Không commit mật khẩu database, Telegram token, cookie, file export SQL chứa dữ liệu thật, hay biến `BUILT_IN_FORGE_*`. Nếu từng lỡ commit secret, hãy coi secret đó đã lộ: xoay token/mật khẩu trước rồi mới tiếp tục.

## 4. Database: mang dữ liệu và migration đúng cách

TaskFlow dùng MySQL/TiDB qua `DATABASE_URL` và Drizzle ở dialect MySQL. TiDB tương thích cao với giao thức và phần lớn syntax MySQL 5.7/8.0, vì vậy có thể giữ dialect hiện tại với một MySQL-compatible database bên ngoài; vẫn phải thử migration ở staging trước vì có ngoại lệ tương thích. [4]

Quy trình an toàn gồm các bước tuần tự sau:

1. Tạo database mới trên dịch vụ MySQL/TiDB quản lý; bắt buộc bật TLS nếu nhà cung cấp yêu cầu.
2. Lấy connection string chỉ để dán vào trang secrets của host. Không gửi qua chat hoặc commit vào Git.
3. Trên bản sao staging, chạy toàn bộ migration trong thư mục `drizzle/` để tạo schema.
4. Backup database hiện tại trước khi chuyển dữ liệu. Sau đó export theo công cụ do nhà cung cấp database hỗ trợ và import vào database đích.
5. Kiểm tra số lượng users, tasks, calendarEvents, telegramConnections và telegramDeliveryLog; thử tài khoản test độc lập trước khi đổi domain production.
6. Chỉ khi dữ liệu đúng mới đổi `DATABASE_URL` production. Giữ database cũ ở chế độ chỉ đọc trong thời gian rollback.

> Đừng dùng local SQLite hoặc filesystem của Render để lưu dữ liệu TaskFlow. Render nêu rõ filesystem của Free Web Service mất khi redeploy, restart hoặc dịch vụ ngủ. [3]

## 5. Những biến môi trường cần có

| Biến | Có thể dùng ngoài Manus? | Cách xử lý |
|---|---|---|
| `NODE_ENV` | Có | Đặt `production` |
| `PORT` | Có | Host tự cấp; app phải listen theo `process.env.PORT` |
| `DATABASE_URL` | Có | Dùng URL của MySQL/TiDB mới |
| `JWT_SECRET` | Có | Tạo secret dài, ngẫu nhiên, giữ ổn định sau deploy |
| `TELEGRAM_BOT_TOKEN` | Có | Dán vào secret manager của host |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Không mặc định | Là OAuth đặc thù Manus; thay provider hoặc xác minh quyền dùng ngoài domain Manus |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Không | Bỏ/rewrite phần Heartbeat, Forge và storage phụ thuộc các biến này |
| `OWNER_OPEN_ID` | Không cần cho hosting chung | Không dùng làm auth production ngoài Manus |
| `CRON_SECRET` | Nên thêm | Secret riêng để endpoint scheduler xác thực request nội bộ |

Vercel mã hóa environment variables khi lưu; Render cũng khuyến nghị dùng dashboard/environment group thay vì commit credentials. Khi đổi biến, cần deploy lại để runtime mới nhận giá trị. [5] [6]

## 6. Lộ trình khuyến nghị: Render + database MySQL/TiDB bên ngoài

Đây là cách gần với ứng dụng Node/Express hiện có nhất, nhưng **không dùng Free** cho nhắc Telegram production.

1. Đưa repository Private lên GitHub và bảo đảm `pnpm build`, `pnpm check`, `pnpm test` đều chạy trước khi deploy.
2. Tạo Web Service trên Render, chọn repository và nhánh `main`.
3. Thiết lập build command `pnpm install --frozen-lockfile && pnpm build`; start command `pnpm start`.
4. Trong tab Environment, tạo từng secret: `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN` và các biến OAuth **sau khi đã thay OAuth Manus**. Render cho phép cấu hình biến tại Dashboard hoặc bằng Environment Group. [6]
5. Đặt database MySQL/TiDB ở cùng khu vực địa lý với Web Service nếu có thể. Thử kết nối, chạy migration staging và kiểm tra health/log trước.
6. Gắn custom domain, bật TLS, sau đó cập nhật redirect URL ở OAuth provider thành `https://ten-mien-cua-ban/api/oauth/callback`.
7. Chỉ đổi DNS sau khi đăng nhập, tạo task và truy cập lịch đã qua kiểm thử ở domain mới.
8. Tạo một Render Cron Job hoặc scheduler bên ngoài gọi endpoint nội bộ đã xác thực bằng `CRON_SECRET`. Render Cron Job chạy theo UTC, không chạy song song cùng một job, và có mức phí tối thiểu theo mỗi cron service; không dùng nó như một job miễn phí vô hạn. [7]

## 7. Lộ trình VPS: nhiều quyền kiểm soát nhất

VPS phù hợp nếu cần kiểm soát cấu hình, scheduler, log và database. VPS “miễn phí” thường có quota, rủi ro thu hồi, hoặc yêu cầu xác minh thanh toán; không nên đặt dữ liệu cá nhân duy nhất của người dùng ở đó nếu không có backup.

Luồng cài đặt tiêu chuẩn là: Ubuntu LTS → Node.js LTS/pnpm → clone repository → secrets trong file chỉ root đọc được hoặc secret manager → `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm start` dưới `systemd` → Nginx reverse proxy → TLS với Let’s Encrypt → database MySQL/TiDB quản lý riêng → cron hoặc worker.

| Lớp VPS | Công việc bắt buộc |
|---|---|
| **Nginx** | Terminate TLS, chuyển header `X-Forwarded-Proto`, proxy đến Node app |
| **systemd** | Tự chạy lại app khi lỗi/reboot, không chạy bằng terminal SSH |
| **UFW/firewall** | Chỉ mở 80/443; database không mở public nếu không cần |
| **Database** | Phân quyền user tối thiểu, TLS, backup tự động và test khôi phục |
| **Scheduler** | Cron gọi worker/API với `CRON_SECRET`; UTC và idempotency |
| **Monitoring** | Theo dõi lỗi login, gửi Telegram thất bại, dung lượng DB, thời hạn TLS |

## 8. Lộ trình Vercel: có thể nhưng cần refactor

Vercel hỗ trợ Express, nhưng Express app trở thành một Vercel Function và bị chi phối bởi giới hạn của Functions. Static assets cần nằm ở `public/**`; `express.static()` không phục vụ assets trên Vercel. [1]

Vì TaskFlow đang khởi tạo một HTTP server dài hạn và tự gọi `server.listen(...)`, cần refactor trước: tách phần tạo Express app ra một module có `export default app`, bỏ logic tìm port/listen ở entry Vercel, và build client thành assets được Vercel phục vụ. Không nên deploy nguyên trạng rồi mong Vercel tự vận hành giống VPS.

Vercel Cron gọi một HTTP GET tới path cấu hình trong `vercel.json`, chạy theo UTC. Endpoint hiện tại của TaskFlow là POST và dựa vào token Heartbeat Manus, nên cần tạo endpoint cron mới, xác thực bằng `CRON_SECRET`, rồi dùng logic idempotent để chỉ gửi mỗi reminder một lần. [2]

Ví dụ cấu hình khái niệm:

```json
{
  "crons": [
    { "path": "/api/cron/telegram-reminders", "schedule": "*/5 * * * *" }
  ]
}
```

Tần suất, giới hạn plan và chi phí phải được kiểm tra trong dashboard Vercel trước khi bật production. Không đưa `CRON_SECRET` vào client bundle; chỉ đọc trên server và từ chối request không có secret hợp lệ.

## 9. OAuth và scheduler: hai blocker lớn nhất

Để giữ đăng nhập Manus trên host ngoài, cần xác nhận rõ từ Manus rằng app ID, OAuth endpoint và redirect URI có được phép chạy ở domain ngoài `manus.space` hay không. Nếu không có xác nhận, hãy thay bằng một nhà cung cấp OAuth khác trước khi migrate. Không nên copy các biến Manus sang host khác và coi đó là giải pháp lâu dài.

Tương tự, Heartbeat hiện tại gọi API nội bộ Manus để tạo, đổi và xóa job. Trước khi migrate, hãy viết một abstraction scheduler mới với ba thao tác: `schedule`, `cancel`, `runDueReminders`. Scheduler phải kiểm tra `reminderAt`, `telegramSentAt`, `userId` và log delivery để chạy lặp cũng không gửi trùng.

## 10. Checklist cutover và rollback

1. Hoàn tất staging ở domain phụ, database copy và OAuth mới.
2. Backup cả database nguồn lẫn database đích; thử restore tối thiểu một lần.
3. Dừng tạo/sửa dữ liệu trong vài phút lúc export cuối để không mất bản ghi mới.
4. Import bản export cuối, đối chiếu số lượng dữ liệu và chạy smoke test.
5. Đổi DNS/custom domain, theo dõi login, tRPC errors và Telegram delivery log.
6. Nếu có lỗi nghiêm trọng, quay DNS về Manus, giữ database đích để điều tra, không ghi đè database nguồn.

## Tài liệu tham chiếu

[1]: https://vercel.com/docs/frameworks/backend/express "Vercel Docs — Express on Vercel"
[2]: https://vercel.com/docs/cron-jobs "Vercel Docs — Cron Jobs"
[3]: https://render.com/docs/free "Render Docs — Deploy for Free"
[4]: https://docs.pingcap.com/tidbcloud/mysql-compatibility/ "TiDB Cloud Docs — MySQL Compatibility"
[5]: https://vercel.com/docs/environment-variables "Vercel Docs — Environment Variables"
[6]: https://render.com/docs/configure-environment-variables "Render Docs — Environment Variables and Secrets"
[7]: https://render.com/docs/cronjobs "Render Docs — Cron Jobs"
