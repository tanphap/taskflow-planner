import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { type Language } from "@/contexts/languageStore";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { quickReminderAt } from "../../../shared/recurrence";
import { getNotificationBellData } from "../../../shared/notificationBell";
import { eventPrefillFromTask, type EventPrefill } from "../../../shared/taskEvent";
import { getVietnameseCalendarDay } from "../../../shared/vietnameseCalendar";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type View = "dashboard" | "tasks" | "calendar" | "notifications" | "profile" | "email";
type TaskStatus = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high";

const englishCopy: Record<string, string> = {
  "Tổng quan": "Overview", "Công việc": "Tasks", "Lịch hẹn": "Calendar", "Nhắc việc": "Reminders", "Hồ sơ": "Profile",
  "Bảng điều khiển": "Workspace", "Không gian cá nhân / 2026": "Personal workspace / 2026", "Tài khoản của bạn": "Your account", "Chưa có email": "No email",
  "Đóng menu": "Close menu", "Mở menu": "Open menu", "Tổng quan hôm nay": "Today overview", "Trung tâm nhắc việc": "Reminder center", "Hồ sơ cá nhân": "Personal profile",
  "Thứ Hai": "Monday", "T2": "Mon", "T3": "Tue", "T4": "Wed", "T5": "Thu", "T6": "Fri", "T7": "Sat", "CN": "Sun", "Chưa làm": "To do", "Đang làm": "In progress", "Hoàn thành": "Completed",
  "Thông báo": "Notifications", "Bạn không có thông báo mới.": "You have no new notifications.", "Email mới": "New email", "Việc cần chú ý": "Items needing attention", "Xem trung tâm nhắc việc": "Open reminder center", "Đánh dấu tất cả đã đọc": "Mark all as read", "Công việc tới hạn": "Task due", "Lịch hẹn tới hạn": "Event due", "Không có tiêu đề": "No subject",
  "Email AI mới nhất": "Latest AI email", "Tóm tắt từ Gemini": "Gemini summary", "Chưa có email nào được AI tóm tắt.": "No emails have been summarized by AI yet.", "Mở Quản trị email": "Open email manager", "AI đã tóm tắt": "AI summarized",
  "Thấp": "Low", "Trung bình": "Medium", "Cao": "High", "Chưa có thời hạn": "No due date", "Bạn có một nhắc việc mới.": "You have a new reminder.",
  "Đã tạo công việc": "Task created", "Đã cập nhật công việc": "Task updated", "Đã xóa công việc": "Task deleted", "Đã tạo lịch hẹn": "Event created", "Đã cập nhật lịch hẹn": "Event updated", "Đã xóa lịch hẹn": "Event deleted",
  "Thông tin hồ sơ đã được lưu": "Profile saved", "Đã tạo mã liên kết Telegram": "Telegram link code created", "Telegram đã được liên kết": "Telegram linked",
  "Chưa tìm thấy mã. Hãy gửi mã hiển thị bên dưới vào cuộc trò chuyện với Bot.": "Code not found. Send the code below to the Bot conversation.",
  "Tình hình hôm nay": "Today’s status", "Làm việc có chủ đích, không chỉ bận rộn.": "Work with intention, not just activity.", "Tỷ lệ hoàn thành": "Completion rate",
  "Thao tác nhanh": "Quick actions", "Tạo công việc mới": "Create new task", "Xem lịch hẹn": "View calendar", "Đang thực hiện": "In progress", "Việc cần làm hôm nay": "Tasks due today", "Xem tất cả": "View all",
  "Không còn việc nào đến hạn hôm nay.": "No tasks are due today.", "Tạo công việc": "Create task", "Lịch hẹn sắp tới": "Upcoming events", "Mở lịch": "Open calendar", "Chưa có lịch hẹn nào sắp diễn ra.": "No upcoming events.", "Tạo lịch hẹn": "Create event", "Tiếp theo": "Up next", "Đến hạn:": "Due:",
  "Danh sách /": "List /", "Mọi công việc, cùng một nhịp.": "All tasks, one rhythm.", "Trạng thái": "Status", "Ưu tiên": "Priority", "Tất cả": "All", "Mọi mức": "All levels", "Đánh dấu hoàn thành": "Mark complete", "Hạn": "Due", "Xóa công việc": "Delete task", "Đặt lịch hẹn từ công việc": "Schedule event from task", "Đặt lịch hẹn": "Schedule event",
  "Chưa có công việc phù hợp": "No matching tasks", "Thử thay đổi bộ lọc hoặc thêm công việc đầu tiên của bạn.": "Try changing filters or add your first task.", "Thêm công việc": "Add task",
  "Lịch cá nhân": "Personal calendar", "Tháng": "Month", "Tuần": "Week", "Ngày": "Day", "Hạn công việc": "Task due", "Trống": "Empty", "Ngày đã chọn": "Selected day", "sự kiện": "events", "công việc": "tasks", "điều cần chú ý": "reminders need attention", "Công việc đến hạn": "Task due", "Ngày này chưa có lịch hẹn hay công việc đến hạn.": "No events or due tasks on this day.",
  "Nhắc việc trong ứng dụng": "In-app reminders", "Đánh dấu đã đọc": "Mark all read", "Mọi thứ đều đúng nhịp": "Everything is on track", "Nhắc việc sẽ xuất hiện tại đây khi bạn đến thời điểm đã đặt.": "Reminders appear here at their scheduled time.", "Nhắc việc được đồng bộ khi ứng dụng đang mở và cũng xuất hiện ngay khi bạn quay lại không gian làm việc.": "Reminders sync while the app is open and appear when you return to your workspace.",
  "Tài khoản Manus": "Manus account", "Không gian của riêng bạn.": "Your own workspace.", "Thông tin này thuộc tài khoản hiện tại. Công việc, lịch hẹn và nhắc việc luôn được phân tách theo từng người đăng nhập.": "This information belongs to your current account. Tasks, events and reminders are separated for every signed-in user.", "Đăng xuất": "Sign out", "Thông tin hiển thị": "Display details", "Tên hiển thị": "Display name", "Địa chỉ email": "Email address", "Tên của bạn": "Your name", "Lưu thay đổi": "Save changes", "Kênh nhắc lịch": "Reminder channel", "Đã liên kết": "Connected", "Chưa liên kết": "Not connected", "Lời nhắc Telegram sẽ được gửi riêng đến cuộc trò chuyện Bot này.": "Telegram reminders will be sent privately to this Bot conversation.", "Tạo mã, gửi mã đó vào cuộc trò chuyện riêng với Bot, rồi xác nhận liên kết tại đây.": "Create a code, send it to the Bot in a private chat, then confirm it here.", "Gửi nguyên mã này cho Bot": "Send this exact code to the Bot", "Xác nhận liên kết": "Confirm link", "Tạo mã mới": "Create new code", "Liên kết Telegram": "Link Telegram",
  "Lịch hẹn /": "Calendar /", "Chỉnh sửa": "Edit", "Tạo mới": "Create", "Cập nhật lịch hẹn": "Update event", "Lịch hẹn mới": "New event", "Tiêu đề *": "Title *", "Mô tả": "Description", "Ví dụ: Họp với đội dự án": "Example: Project team meeting", "Chi tiết lịch hẹn": "Event details", "Bắt đầu *": "Start *", "Kết thúc *": "End *", "Nhắc vào lúc": "Remind at", "Gửi nhắc qua Telegram": "Send reminder via Telegram", "Yêu cầu Telegram đã được liên kết và ứng dụng đã xuất bản.": "Requires a linked Telegram account and a published app.", "Hủy": "Cancel", "Thời gian kết thúc phải sau thời gian bắt đầu": "End time must be after start time", "Hãy chọn thời điểm nhắc để gửi Telegram": "Choose a reminder time to send via Telegram", "Lặp lại": "Repeat", "Không lặp": "Does not repeat", "Hàng ngày": "Daily", "Hàng tuần": "Weekly", "Hàng tháng": "Monthly", "Khoảng lặp": "Repeat interval", "Ngày trong tuần": "Days of week", "Giới hạn": "Ends", "Không giới hạn": "Never", "Đến ngày": "On date", "Sau số lần": "After occurrences", "Số lần lặp": "Occurrences", "Nhắc nhanh": "Quick reminder", "5 phút trước": "5 min before", "15 phút trước": "15 min before", "30 phút trước": "30 min before", "Hãy chọn thời điểm bắt đầu trước khi đặt nhắc nhanh": "Choose a start time before setting a quick reminder", "Hãy chọn ít nhất một ngày trong tuần": "Choose at least one day of the week", "Hãy chọn ngày kết thúc": "Choose an end date", "Hãy nhập số lần lặp hợp lệ": "Enter a valid occurrence count", "Lịch sử nhắc Telegram": "Telegram reminder history", "Chưa có lần gửi nào.": "No delivery attempts yet.", "Đã gửi": "Sent", "Không thể gửi": "Failed", "Lỗi không xác định": "Unknown error", "Chuỗi lặp lại": "Recurring series",
  "Lập kế hoạch cá nhân — 01": "Personal planning — 01", "Tổ chức công việc.": "Organize your work.", "Rõ ràng": "Clearly", "từng ngày.": "every day.", "Không gian cá nhân cho công việc, lịch hẹn và nhắc việc — được thiết kế trên một hệ lưới trực quan và chính xác.": "A personal workspace for tasks, events and reminders — built on a precise, intuitive grid.", "Đăng nhập an toàn": "Secure sign in", "Sẵn sàng bắt đầu?": "Ready to begin?", "Dữ liệu công việc và lịch hẹn được tách biệt theo tài khoản Manus của bạn.": "Task and event data are isolated by your Manus account.", "Tiếp tục với Manus": "Continue with Manus", "Bằng việc tiếp tục, bạn sử dụng luồng xác thực Manus OAuth để truy cập không gian cá nhân của mình.": "By continuing, you use Manus OAuth to access your personal workspace."
};

Object.assign(englishCopy, {
  "Quản trị email": "Email manager",
  "Hộp thư /": "Mailbox /",
  "Kết nối hộp thư của bạn. Xử lý điều quan trọng.": "Connect your inbox. Handle what matters.",
  "Hộp thư đã kết nối": "Connected mailboxes",
  "Kết nối Gmail": "Connect Gmail",
  "Kết nối Outlook": "Connect Outlook",
  "Gmail": "Gmail",
  "Outlook / Microsoft 365": "Outlook / Microsoft 365",
  "OAuth chưa được cấu hình": "OAuth is not configured",
  "Bạn sẽ đăng nhập và cấp quyền trực tiếp với nhà cung cấp. TaskFlow không lưu mật khẩu email.": "You sign in and grant consent directly with the provider. TaskFlow never stores your email password.",
  "Đồng bộ ngay": "Sync now",
  "Đang đồng bộ": "Syncing",
  "Ngắt kết nối": "Disconnect",
  "Kết nối hoạt động": "Connection active",
  "Cần kết nối lại": "Reconnect required",
  "Có lỗi đồng bộ": "Sync error",
  "Chưa có hộp thư nào được kết nối.": "No mailboxes are connected yet.",
  "Thư đến": "Inbox",
  "Tất cả hộp thư": "All mailboxes",
  "Tất cả trạng thái": "All statuses",
  "Mới": "New",
  "Đang xử lý": "In progress",
  "Đã xử lý": "Done",
  "Lưu trữ": "Archived",
  "Chưa có email được đồng bộ.": "No emails have been synced.",
  "Kết nối hộp thư, sau đó chọn Đồng bộ ngay để tải metadata email mới nhất.": "Connect a mailbox, then select Sync now to load the latest email metadata.",
  "Mở trong hộp thư": "Open in mailbox",
  "Đánh dấu đang xử lý": "Mark in progress",
  "Đánh dấu đã xử lý": "Mark done",
  "Đã đồng bộ hộp thư": "Mailbox synced",
  "Đã ngắt kết nối hộp thư": "Mailbox disconnected",
  "Cần cấu hình OAuth trước khi kết nối": "OAuth needs configuration before connecting",
  "Kết nối email thành công": "Email connected",
  "Người dùng đã hủy kết nối email": "Email connection was cancelled",
  "Phiên kết nối email không hợp lệ hoặc đã hết hạn": "Email connection session is invalid or expired",
  "Không thể kết nối email. Hãy thử lại.": "Could not connect email. Please try again.",
  "Trợ lý AI cho email": "AI email assistant",
  "AI chỉ tạo đề xuất. Bạn luôn xem và xác nhận trước khi tạo lịch hẹn hoặc nhắc Telegram.": "AI only creates proposals. You always review and confirm before an event or Telegram reminder is created.",
  "Bật quét AI tự động": "Enable automatic AI scan",
  "Quét AI ngay": "Scan with AI now",
  "Lưu chu kỳ": "Save interval",
  "Mỗi 15 phút": "Every 15 minutes",
  "Mỗi 30 phút": "Every 30 minutes",
  "Mỗi giờ": "Every hour",
  "Mỗi 2 giờ": "Every 2 hours",
  "Mỗi 4 giờ": "Every 4 hours",
  "Mỗi 12 giờ": "Every 12 hours",
  "Mỗi ngày": "Every day",
  "Đề xuất lịch hẹn AI": "AI event proposals",
  "Chưa có đề xuất nào đang chờ xác nhận.": "No proposals are waiting for confirmation.",
  "Xem và tạo lịch hẹn": "Review and create event",
  "Bỏ qua đề xuất": "Dismiss proposal",
  "Độ tin cậy": "Confidence",
  "Nguồn email": "Email source",
  "Liên kết kế hoạch": "Planning link",
  "Đã lưu cấu hình quét AI": "AI scan settings saved",
  "AI đã phân tích": "AI analyzed",
  "email mới": "new emails",
  "Đồng bộ inbox qua IMAP. Gmail dùng mật khẩu ứng dụng được mã hóa; Outlook/Microsoft 365 đăng nhập OAuth2 theo yêu cầu bảo mật của Microsoft.": "Sync inboxes through IMAP. Gmail uses an encrypted app password; Outlook/Microsoft 365 signs in with OAuth2 as required by Microsoft.",
  "Mật khẩu này không hiển thị lại sau khi lưu. Bạn có thể ngắt kết nối bất cứ lúc nào để xóa secret.": "This password is never shown again after saving. Disconnect at any time to remove the secret.",
  "Đồng bộ metadata thư; không hiển thị token hoặc mật khẩu ứng dụng.": "Only mail metadata is synced; tokens and app passwords are never shown.",
  "Kết nối Gmail qua IMAP": "Connect Gmail via IMAP",
  "Kết nối Outlook qua IMAP": "Connect Outlook via IMAP",
  "Đang kiểm tra IMAP…": "Checking IMAP…",
  "Đã kết nối Gmail qua IMAP": "Gmail connected through IMAP",
  "Cần cấu hình OAuth Microsoft trước khi kết nối": "Microsoft OAuth must be configured before connecting",
  "Cần cấu hình OAuth Microsoft trước": "Microsoft OAuth configuration is required",
  "Địa chỉ Gmail": "Gmail address",
  "Tên đăng nhập IMAP": "IMAP username",
  "(nếu khác Gmail)": "(if different from Gmail)",
  "Mật khẩu ứng dụng": "App password",
  "Chỉ dùng mật khẩu ứng dụng; TaskFlow mã hóa secret trước khi lưu.": "Use an app password only; TaskFlow encrypts the secret before storing it.",
  "Đồng bộ bằng IMAP, xác thực OAuth2 theo yêu cầu Modern Auth của Microsoft. Bạn tự đăng nhập và cấp quyền.": "Sync through IMAP and authenticate with OAuth2 as required by Microsoft Modern Auth. You sign in and grant permission yourself.",
  "Quản trị viên cần cấu hình OAuth Microsoft một lần. Người dùng sẽ tự đăng nhập và cấp quyền hộp thư của mình.": "An administrator must configure Microsoft OAuth once. Each user then signs in and grants mailbox permission.",
  "CẦN CẤU HÌNH": "CONFIGURATION REQUIRED",
  "SẴN SÀNG": "READY",
  "Gemini miễn phí — tóm tắt theo yêu cầu": "Free Gemini — on-demand summary",
  "Chỉ gửi tiêu đề, người gửi và phần xem trước của thư Gmail bạn bấm tóm tắt tới Gemini. Không quét inbox tự động; bạn có thể tóm tắt các email đã chọn không giới hạn lượt trong ứng dụng.": "Only the subject, sender, and preview of a Gmail message you choose are sent to Gemini. The inbox is never scanned automatically; you can summarize selected emails without an in-app daily limit.",
  "Đồng ý gửi tiêu đề, người gửi và phần xem trước của thư này tới Gemini miễn phí? Google có thể xử lý dữ liệu theo điều khoản của dịch vụ miễn phí. Không gửi email nhạy cảm.": "Do you agree to send this email's subject, sender, and preview to free Gemini? Google may process data under its free-service terms. Do not send sensitive email.",
  "Tóm tắt bằng Gemini": "Summarize with Gemini",
  "Gemini đang tóm tắt…": "Gemini is summarizing…",
  "Chỉ Gmail": "Gmail only",
  "TÓM TẮT GEMINI": "GEMINI SUMMARY",
  "Bản tóm tắt này được tạo từ tiêu đề và phần xem trước đã đồng bộ, có thể chưa phản ánh toàn bộ nội dung email.": "This summary is generated from the synced subject and preview, and may not reflect the full email.",
  "Tóm tắt Gemini đã sẵn sàng": "Gemini summary is ready",
  "Tổng quan AI": "AI overview",
  "Tổng email": "Total emails",
  "Đã tóm tắt": "Summarized",
  "Đề xuất đang chờ": "Pending proposals",
  "Ghi chú email": "Email notes",
  "Ghi chú": "Notes",
  "Thêm ghi chú": "Add note",
  "Lưu ghi chú": "Save note",
  "Cập nhật ghi chú": "Update note",
  "Hủy chỉnh sửa": "Cancel editing",
  "Tiêu đề ghi chú": "Note title",
  "Nội dung lưu ý": "Note details",
  "Ghim ghi chú": "Pin note",
  "Bỏ ghim": "Unpin",
  "Đã ghim": "Pinned",
  "Thư nguồn (tùy chọn)": "Source email (optional)",
  "Hộp thư nguồn (tùy chọn)": "Source mailbox (optional)",
  "Không liên kết hộp thư": "No mailbox linked",
  "Không liên kết thư nguồn": "No source email linked",
  "Chưa có ghi chú nào.": "No notes yet.",
  "Tạo ghi chú để lưu ý một email quan trọng hoặc việc cần theo dõi.": "Create a note for an important email or follow-up.",
  "Xóa ghi chú": "Delete note",
  "Xóa ghi chú này?": "Delete this note?",
  "Đã lưu ghi chú": "Note saved",
  "Đã cập nhật ghi chú": "Note updated",
  "Đã xóa ghi chú": "Note deleted",
  "Tóm tắt hôm nay": "summaries today",
  "Số liệu tổng hợp chỉ hiển thị dữ liệu email thuộc tài khoản Manus hiện tại.": "Summary data only includes email belonging to the current Manus account.",
  "Ghi chú được ghim sẽ luôn hiển thị trước.": "Pinned notes always appear first."
  ,"ĐÃ GHIM": "PINNED"
  ,"GHI CHÚ": "NOTES"
  ,"Chỉnh sửa": "Edit"
  ,"Xóa": "Delete"
  ,"(Không có tiêu đề)": "(No subject)"
});

const vietnameseCopy: Record<string, string> = Object.fromEntries(Object.entries(englishCopy).map(([vietnamese, english]) => [english, vietnamese]));

function getAppLocale() {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-US" : "vi-VN";
}

function translateAppText(language: Language, value: string) {
  const translations = language === "en" ? englishCopy : vietnameseCopy;
  const before = value.match(/^\s*/)?.[0] ?? "";
  const after = value.match(/\s*$/)?.[0] ?? "";
  const trimmed = value.trim();
  return translations[trimmed] ? `${before}${translations[trimmed]}${after}` : value;
}

function applyLanguageToDocument(language: Language) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach(node => { const next = translateAppText(language, node.nodeValue ?? ""); if (next !== node.nodeValue) node.nodeValue = next; });
  document.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]").forEach(element => {
    ["placeholder", "aria-label", "title"].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translateAppText(language, value));
    });
  });
}

type TaskRecord = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: Date | null;
  reminderAt: Date | null;
  completedAt: Date | null;
};

type EventRecord = {
  id: number;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  reminderAt: Date | null;
  telegramReminder: boolean;
  recurrenceRule?: string | null;
  sourceEventId?: number;
  occurrenceIndex?: number;
  isRecurringOccurrence?: boolean;
  seriesStartAt?: Date;
  seriesEndAt?: Date;
};

type RecurrenceInput = {
  freq: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
};

type TelegramDeliveryLogRecord = {
  id: number;
  eventId: number;
  eventTitle: string;
  sentAt: Date;
  status: "success" | "error";
  errorMessage: string | null;
};

type NotificationRecord = {
  id: number;
  kind: "task" | "event";
  title: string;
  body: string | null;
  scheduledFor: Date;
};

type EmailAccountRecord = {
  id: number;
  provider: "google" | "microsoft";
  email: string;
  displayName: string | null;
  authMethod: "app_password" | "oauth2";
  imapHost: string | null;
  imapPort: number | null;
  imapSecure: boolean;
  imapUsername: string | null;
  imapMailbox: string;
  connectionStatus: "connected" | "needs_reconnect" | "error";
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  aiSyncEnabled: boolean;
  aiSyncIntervalMinutes: number;
  aiSyncLastRunAt: Date | null;
  aiSyncLastError: string | null;
  createdAt: Date;
};

type EmailMessageRecord = {
  id: number;
  emailAccountId: number;
  subject: string;
  senderName: string | null;
  senderEmail: string | null;
  snippet: string | null;
  receivedAt: Date;
  isRead: boolean;
  webLink: string | null;
  status: EmailMessageStatus;
};

type EmailMessageStatus = "new" | "in_progress" | "done" | "archived";
type EmailProviderConfiguration = { google: boolean; microsoft: boolean };
type EmailEventSuggestionRecord = { id: number; emailAccountId: number; emailMessageId: number; title: string; description: string | null; startAt: Date; endAt: Date; reminderMinutes: number; planLink: string | null; sourceExcerpt: string | null; confidence: number; status: "pending" | "accepted" | "dismissed" | "error"; calendarEventId: number | null; analyzedAt: Date; emailSubject: string; senderName: string | null; senderEmail: string | null; webLink: string | null };
type EmailGeminiSummaryRecord = { id: number; emailMessageId: number; emailAccountId: number; summary: string; locale: string; model: string; generatedAt: Date };
type EmailAiOverviewData = { inboxCount: number; summarizedCount: number; summarizedToday: number; recentSummaries: Array<{ id: number; emailMessageId: number; summary: string; generatedAt: Date; emailSubject: string; senderName: string | null }> };

function NotificationBell({ open, onOpenChange, emails, dueNotifications, onOpenEmail, onOpenReminders, onMarkAllRead }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: EmailMessageRecord[];
  dueNotifications: NotificationRecord[];
  onOpenEmail: () => void;
  onOpenReminders: () => void;
  onMarkAllRead: () => void;
}) {
  const { language } = useLanguage();
  const t = (value: string) => translateAppText(language, value);
  const total = emails.length + dueNotifications.length;
  const openEmail = () => { onOpenEmail(); onOpenChange(false); };
  const openReminders = () => { onOpenReminders(); onOpenChange(false); };

  return <div className="relative">
    <button type="button" onClick={() => onOpenChange(!open)} aria-label={t("Thông báo")} aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] shadow-sm transition hover:border-[var(--line-strong)] hover:text-[var(--terracotta)] active:scale-[0.97]">
      <Bell className="h-4 w-4" />
      {total > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--canvas)] bg-[var(--terracotta)] px-1 text-[10px] font-bold leading-none text-white">{total > 9 ? "9+" : total}</span>}
    </button>
    {open && <div role="dialog" aria-label={t("Thông báo")} className="notification-popover absolute right-[-2.75rem] top-[calc(100%+0.7rem)] z-[70] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgb(57_43_32/0.18)] sm:right-0 sm:w-[min(23rem,calc(100vw-2rem))]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-4"><div><p className="mono-label text-[var(--terracotta)]">Alert center</p><h2 className="mt-1 font-display text-xl tracking-[-0.03em]">{t("Thông báo")}</h2></div>{dueNotifications.length > 0 && <button type="button" onClick={onMarkAllRead} className="text-[11px] font-semibold text-[var(--ink-muted)] transition hover:text-[var(--terracotta)]">{t("Đánh dấu tất cả đã đọc")}</button>}</div>
      {total === 0 ? <div className="grid min-h-44 place-items-center p-6 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--sage-soft)]"><CheckCircle2 className="h-5 w-5 text-[var(--sage)]" /></span><p className="mt-3 text-sm font-semibold">{t("Bạn không có thông báo mới.")}</p></div></div> : <div className="max-h-[min(60vh,30rem)] overflow-y-auto">
        {emails.length > 0 && <section><div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--sage-soft)] px-4 py-2.5"><span className="mono-label text-[var(--sage)]">{t("Email mới")}</span><span className="mono-label text-[var(--sage)]">{emails.length.toString().padStart(2, "0")}</span></div>{emails.slice(0, 5).map(email => <button type="button" key={email.id} onClick={openEmail} className="block w-full border-b border-[var(--line)] px-4 py-3.5 text-left transition hover:bg-[var(--surface-soft)]"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--terracotta-soft)]"><Mail className="h-4 w-4 text-[var(--terracotta)]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{email.subject || t("Không có tiêu đề")}</p><p className="mt-1 truncate text-xs text-[var(--ink-muted)]">{email.senderName || email.senderEmail || "—"} · {formatTime(email.receivedAt)}</p></div></div></button>)}</section>}
        {dueNotifications.length > 0 && <section><div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--terracotta-soft)] px-4 py-2.5"><span className="mono-label text-[var(--terracotta-dark)]">{t("Việc cần chú ý")}</span><span className="mono-label text-[var(--terracotta-dark)]">{dueNotifications.length.toString().padStart(2, "0")}</span></div>{dueNotifications.slice(0, 5).map(notification => <button type="button" key={notification.id} onClick={openReminders} className="block w-full border-b border-[var(--line)] px-4 py-3.5 text-left transition hover:bg-[var(--surface-soft)]"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--terracotta-soft)]"><AlarmClock className="h-4 w-4 text-[var(--terracotta)]" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{notification.title}</p><p className="mt-1 truncate text-xs text-[var(--ink-muted)]">{notification.kind === "task" ? t("Công việc tới hạn") : t("Lịch hẹn tới hạn")} · {formatTime(notification.scheduledFor)}</p></div></div></button>)}</section>}
      </div>}
      {total > 0 && <button type="button" onClick={openReminders} className="flex w-full items-center justify-between border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left text-sm font-semibold transition hover:bg-[var(--surface-soft)] hover:text-[var(--terracotta)]"><span>{t("Xem trung tâm nhắc việc")}</span><ArrowRight className="h-4 w-4" /></button>}
    </div>}
  </div>;
}

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "Chưa làm", className: "bg-neutral-100 text-neutral-700" },
  in_progress: { label: "Đang làm", className: "bg-amber-100 text-amber-900" },
  done: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-900" },
};

const priorityMeta: Record<Priority, { label: string; className: string }> = {
  low: { label: "Thấp", className: "bg-neutral-100 text-neutral-700" },
  medium: { label: "Trung bình", className: "bg-orange-100 text-orange-900" },
  high: { label: "Cao", className: "bg-red-600 text-white" },
};

const navigation: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "tasks", label: "Công việc", icon: ClipboardList },
  { id: "calendar", label: "Lịch hẹn", icon: CalendarDays },
  { id: "notifications", label: "Nhắc việc", icon: Bell },
  { id: "email", label: "Quản trị email", icon: Mail },
  { id: "profile", label: "Hồ sơ", icon: UserRound },
];

function asDate(value: Date | string | null | undefined) {
  return value ? new Date(value) : null;
}

function localDayKey(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeInput(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function parseRecurrenceInput(value: string | null | undefined): RecurrenceInput | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as RecurrenceInput;
    return ["daily", "weekly", "monthly"].includes(parsed.freq) ? parsed : null;
  } catch { return null; }
}

function weekdayFromDateTime(value: string) {
  const day = new Date(value).getDay();
  return day === 0 ? 7 : day;
}

function formatDate(value: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = asDate(value);
  if (!date) return "Chưa có thời hạn";
  return new Intl.DateTimeFormat(getAppLocale(), options ?? { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat(getAppLocale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function EmailManager({ configuration, accounts, messages, suggestions, geminiSummaries, aiOverview, loading, accountFilter, statusFilter, syncingAccountId, disconnectingAccountId, updatingMessageId, configuringAccountId, analyzingAccountId, dismissingSuggestionId, summarizingMessageId, connectingGmail, onAccountFilter, onStatusFilter, onConnectGmail, onConnectMicrosoft, onSync, onDisconnect, onSetMessageStatus, onConfigureAiSync, onAnalyze, onReviewSuggestion, onDismissSuggestion, onSummarizeGmail }: {
  configuration?: EmailProviderConfiguration;
  accounts: EmailAccountRecord[];
  messages: EmailMessageRecord[];
  suggestions: EmailEventSuggestionRecord[];
  geminiSummaries: EmailGeminiSummaryRecord[];
  aiOverview?: EmailAiOverviewData;
  loading: boolean;
  accountFilter: number | "all";
  statusFilter: EmailMessageStatus | "all";
  syncingAccountId: number | null;
  disconnectingAccountId: number | null;
  updatingMessageId: number | null;
  configuringAccountId: number | null;
  analyzingAccountId: number | null;
  dismissingSuggestionId: number | null;
  summarizingMessageId: number | null;
  connectingGmail: boolean;
  onAccountFilter: (value: number | "all") => void;
  onStatusFilter: (value: EmailMessageStatus | "all") => void;
  onConnectGmail: (input: { email: string; username?: string; appPassword: string }) => void;
  onConnectMicrosoft: () => void;
  onSync: (id: number) => void;
  onDisconnect: (id: number) => void;
  onSetMessageStatus: (id: number, status: EmailMessageStatus) => void;
  onConfigureAiSync: (id: number, enabled: boolean, intervalMinutes: number) => void;
  onAnalyze: (id: number) => void;
  onReviewSuggestion: (suggestion: EmailEventSuggestionRecord) => void;
  onDismissSuggestion: (id: number) => void;
  onSummarizeGmail: (id: number) => void;
}) {
  const { language } = useLanguage();
  const t = (value: string) => translateAppText(language, value);
  const statusLabel: Record<EmailMessageStatus, string> = { new: "Mới", in_progress: "Đang xử lý", done: "Đã xử lý", archived: "Đã lưu trữ" };
  const providerLabel = (provider: EmailAccountRecord["provider"]) => provider === "google" ? "Gmail" : "Outlook / Microsoft 365";
  const providerEnabled = (provider: "google" | "microsoft") => Boolean(configuration?.[provider]);
  const [intervals, setIntervals] = useState<Record<number, number>>({});
  const [gmailForm, setGmailForm] = useState({ email: "", username: "", appPassword: "" });
  const intervalFor = (account: EmailAccountRecord) => intervals[account.id] ?? account.aiSyncIntervalMinutes;
  const geminiSummaryByMessage = new Map(geminiSummaries.map(summary => [summary.emailMessageId, summary]));
  const overviewStats = [
    { label: t("Tổng email"), value: aiOverview?.inboxCount ?? messages.length, className: "bg-black text-white", icon: Inbox },
    { label: t("Đã tóm tắt"), value: aiOverview?.summarizedCount ?? geminiSummaries.length, className: "bg-[#e4ff3f] text-[#18211b]", icon: Sparkles },
    { label: t("Đề xuất đang chờ"), value: suggestions.length, className: "bg-[#fff2ef] text-[#e23221]", icon: CalendarDays },
  ];

  return <section className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mono-label text-[var(--terracotta)]">Email operations</p>
        <h2 className="mt-2 font-display text-4xl tracking-[-0.04em] text-[var(--ink)] md:text-5xl">Quản trị email</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">Đồng bộ inbox qua IMAP. Gmail dùng mật khẩu ứng dụng được mã hóa; Outlook/Microsoft 365 đăng nhập OAuth2 theo yêu cầu bảo mật của Microsoft.</p>
      </div>
      <span className="mono-label w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink-muted)]">{accounts.length} HỘP THƯ</span>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <form className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)] p-5" onSubmit={event => { event.preventDefault(); onConnectGmail({ email: gmailForm.email, username: gmailForm.username || undefined, appPassword: gmailForm.appPassword }); }}>
        <div className="flex items-start justify-between gap-4"><div><p className="mono-label text-neutral-500">IMAP + TLS</p><h3 className="mt-2 text-xl font-extrabold tracking-[-0.035em]">Gmail</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Kết nối qua <strong>imap.gmail.com:993</strong>. Chỉ dùng mật khẩu ứng dụng; TaskFlow mã hóa secret trước khi lưu.</p></div><span className={`mono-label px-2 py-1 ${providerEnabled("google") ? "bg-[#e4ff3f] text-[#18211b]" : "bg-neutral-100 text-neutral-500"}`}>{providerEnabled("google") ? "SẴN SÀNG" : "CẦN CẤU HÌNH"}</span></div>
        <div className="mt-5 grid gap-3"><label className="text-xs font-bold">Địa chỉ Gmail<input className="input-swiss mt-1 w-full" type="email" value={gmailForm.email} onChange={event => setGmailForm(previous => ({ ...previous, email: event.target.value }))} autoComplete="email" required /></label><label className="text-xs font-bold">Tên đăng nhập IMAP <span className="font-normal text-neutral-500">(nếu khác Gmail)</span><input className="input-swiss mt-1 w-full" value={gmailForm.username} onChange={event => setGmailForm(previous => ({ ...previous, username: event.target.value }))} autoComplete="username" /></label><label className="text-xs font-bold">Mật khẩu ứng dụng<input className="input-swiss mt-1 w-full" type="password" value={gmailForm.appPassword} onChange={event => setGmailForm(previous => ({ ...previous, appPassword: event.target.value }))} autoComplete="new-password" required /></label></div>
        <button type="submit" className="swiss-button mt-5 w-full justify-center" disabled={!providerEnabled("google") || connectingGmail}>{connectingGmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {connectingGmail ? "Đang kiểm tra IMAP…" : "Kết nối Gmail qua IMAP"}</button>
        <p className="mt-3 text-xs leading-5 text-neutral-500">Mật khẩu này không hiển thị lại sau khi lưu. Bạn có thể ngắt kết nối bất cứ lúc nào để xóa secret.</p>
      </form>
      <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)] p-5"><div className="flex items-start justify-between gap-4"><div><p className="mono-label text-neutral-500">IMAP + OAUTH2</p><h3 className="mt-2 text-xl font-extrabold tracking-[-0.035em]">Outlook / Microsoft 365</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Đồng bộ bằng IMAP, xác thực OAuth2 theo yêu cầu Modern Auth của Microsoft. Bạn tự đăng nhập và cấp quyền.</p></div><span className={`mono-label px-2 py-1 ${providerEnabled("microsoft") ? "bg-[#e4ff3f] text-[#18211b]" : "bg-neutral-100 text-neutral-500"}`}>{providerEnabled("microsoft") ? "SẴN SÀNG" : "CẦN CẤU HÌNH"}</span></div><button type="button" onClick={onConnectMicrosoft} className="swiss-button mt-5 w-full justify-center" disabled={!providerEnabled("microsoft")} title={providerEnabled("microsoft") ? undefined : "Cần cấu hình OAuth Microsoft trước"}><Mail className="h-4 w-4" /> Kết nối Outlook qua IMAP</button>{!providerEnabled("microsoft") && <p className="mt-3 text-xs leading-5 text-neutral-500">Quản trị viên cần cấu hình OAuth Microsoft một lần. Người dùng sẽ tự đăng nhập và cấp quyền hộp thư của mình.</p>}</div>
    </div>

    <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]">
      <div className="flex flex-col gap-3 border-b border-[#18211b] p-5 md:flex-row md:items-center md:justify-between">
        <div><p className="mono-label text-neutral-500">CONNECTED ACCOUNTS</p><h3 className="mt-1 text-xl font-extrabold">Hộp thư đã kết nối</h3></div>
        <span className="text-sm text-neutral-500">Đồng bộ metadata thư; không hiển thị token hoặc mật khẩu ứng dụng.</span>
      </div>
      {accounts.length === 0 ? <div className="p-8 text-center"><Mail className="mx-auto h-8 w-8 text-neutral-400" /><p className="mt-3 font-bold">Chưa có hộp thư nào được kết nối</p><p className="mt-1 text-sm text-neutral-500">Chọn Gmail hoặc Outlook ở trên để bắt đầu.</p></div> : <div className="divide-y divide-[#18211b]/15">
        {accounts.map(account => <div key={account.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="mono-label border border-[#18211b] px-2 py-1">{providerLabel(account.provider)}</span><span className="mono-label border border-[#18211b] px-2 py-1">IMAP · {account.authMethod === "oauth2" ? "OAUTH2" : "APP PASSWORD"}</span><span className={`mono-label px-2 py-1 ${account.connectionStatus === "connected" ? "bg-[#e4ff3f]" : "bg-[#ff5d3d] text-white"}`}>{account.connectionStatus === "connected" ? "ĐÃ KẾT NỐI" : "CẦN KẾT NỐI LẠI"}</span></div><p className="mt-2 truncate font-bold">{account.displayName || account.email}</p><p className="truncate text-sm text-neutral-500">{account.email}</p>{account.lastSyncedAt && <p className="mt-1 text-xs text-neutral-500">Đồng bộ gần nhất: {formatDate(account.lastSyncedAt)} · {formatTime(account.lastSyncedAt)}</p>}{account.lastSyncError && <p className="mt-1 text-xs text-[#e23221]">{account.lastSyncError}</p>}
            <div className="mt-4 grid gap-2 border-l-2 border-[#e23221] bg-[#fbfbfa] p-3 sm:grid-cols-[auto_minmax(160px,1fr)_auto] sm:items-center"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={account.aiSyncEnabled} disabled={account.connectionStatus !== "connected" || configuringAccountId === account.id} onChange={event => onConfigureAiSync(account.id, event.target.checked, intervalFor(account))} /> Bật quét AI tự động</label><select className="input-swiss h-9 text-xs" value={intervalFor(account)} disabled={account.connectionStatus !== "connected" || configuringAccountId === account.id} onChange={event => setIntervals(previous => ({ ...previous, [account.id]: Number(event.target.value) }))}>{[[15, "Mỗi 15 phút"], [30, "Mỗi 30 phút"], [60, "Mỗi giờ"], [120, "Mỗi 2 giờ"], [240, "Mỗi 4 giờ"], [720, "Mỗi 12 giờ"], [1440, "Mỗi ngày"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="swiss-button-outline h-9 justify-center text-xs" onClick={() => onConfigureAiSync(account.id, account.aiSyncEnabled, intervalFor(account))} disabled={account.connectionStatus !== "connected" || configuringAccountId === account.id}>{configuringAccountId === account.id ? "Đang lưu…" : "Lưu chu kỳ"}</button></div>
            {account.aiSyncLastRunAt && <p className="mt-2 text-xs text-neutral-500">AI quét gần nhất: {formatDate(account.aiSyncLastRunAt)} · {formatTime(account.aiSyncLastRunAt)}</p>}{account.aiSyncLastError && <p className="mt-1 text-xs text-[#e23221]">{account.aiSyncLastError}</p>}</div>
          <div className="flex flex-wrap gap-2 xl:justify-end"><button className="swiss-button-outline" onClick={() => onSync(account.id)} disabled={syncingAccountId === account.id}>{syncingAccountId === account.id ? "Đang đồng bộ…" : "Đồng bộ"}</button><button className="swiss-button bg-black text-white hover:bg-[#e23221]" onClick={() => onAnalyze(account.id)} disabled={account.connectionStatus !== "connected" || analyzingAccountId === account.id}>{analyzingAccountId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {analyzingAccountId === account.id ? "AI đang quét…" : "Quét AI ngay"}</button><button className="swiss-button-outline text-[#e23221]" onClick={() => onDisconnect(account.id)} disabled={disconnectingAccountId === account.id}>{disconnectingAccountId === account.id ? "Đang ngắt…" : "Ngắt kết nối"}</button></div>
        </div>)}
      </div>}
    </div>

    <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]">
      <div className="flex flex-col gap-4 border-b border-[#18211b] p-5 md:flex-row md:items-end md:justify-between"><div><p className="mono-label text-neutral-500">AI OVERVIEW</p><h3 className="mt-1 text-xl font-extrabold">{t("Tổng quan AI")}</h3><p className="mt-1 text-sm leading-5 text-neutral-600">{t("Số liệu tổng hợp chỉ hiển thị dữ liệu email thuộc tài khoản Manus hiện tại.")}</p></div><span className="mono-label border border-[#18211b] px-2 py-1">{aiOverview?.summarizedToday ?? 0} {t("Tóm tắt hôm nay")}</span></div>
      <div className="grid sm:grid-cols-3">{overviewStats.map(stat => { const Icon = stat.icon; return <div key={stat.label} className={`min-h-36 border-b border-[#18211b] p-5 last:border-b-0 sm:border-r sm:last:border-r-0 sm:border-b-0 ${stat.className}`}><Icon className="h-5 w-5" /><p className="mt-7 font-display text-5xl leading-none tracking-[-0.045em]">{stat.value.toString().padStart(2, "0")}</p><p className="mono-label mt-3">{stat.label}</p></div>; })}</div>
    </div>

    <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]">
      <div className="grid gap-4 border-b border-[#18211b] p-5 md:grid-cols-[auto_1fr] md:items-center"><div className="grid h-10 w-10 place-items-center bg-[#e23221] text-white"><Sparkles className="h-5 w-5" /></div><div><p className="mono-label text-neutral-500">AI EVENT INBOX</p><h3 className="mt-1 text-xl font-extrabold">Đề xuất lịch hẹn AI</h3><p className="mt-1 max-w-3xl text-sm leading-5 text-neutral-600">AI chỉ tạo đề xuất. Bạn luôn xem và xác nhận trước khi tạo lịch hẹn hoặc nhắc Telegram.</p></div></div>
      {suggestions.length === 0 ? <div className="p-8 text-center"><Sparkles className="mx-auto h-7 w-7 text-neutral-400" /><p className="mt-3 font-bold">Chưa có đề xuất nào đang chờ xác nhận.</p><p className="mt-1 text-sm text-neutral-500">Sau khi đồng bộ thư, chọn Quét AI ngay hoặc bật quét tự động cho từng hộp thư.</p></div> : <div className="divide-y divide-[#18211b]/15">{suggestions.map(suggestion => <article key={suggestion.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="mono-label bg-[#e4ff3f] px-2 py-1">ĐỘ TIN CẬY {Math.round(suggestion.confidence * 100)}%</span><span className="mono-label border border-[#18211b] px-2 py-1">{formatDate(suggestion.startAt)} · {formatTime(suggestion.startAt)}</span></div><h4 className="mt-3 text-lg font-bold tracking-[-0.035em]">{suggestion.title}</h4><p className="mt-1 text-sm text-neutral-600">{suggestion.emailSubject} · {suggestion.senderName || suggestion.senderEmail || "Không rõ người gửi"}</p>{suggestion.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-500">{suggestion.description}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs">{suggestion.planLink && <a className="inline-flex items-center gap-1 font-bold underline underline-offset-4" href={suggestion.planLink} target="_blank" rel="noreferrer">Liên kết kế hoạch <ExternalLink className="h-3.5 w-3.5" /></a>}{suggestion.webLink && <a className="inline-flex items-center gap-1 font-bold underline underline-offset-4" href={suggestion.webLink} target="_blank" rel="noreferrer">Nguồn email <ExternalLink className="h-3.5 w-3.5" /></a>}</div></div><div className="flex flex-wrap gap-2 xl:justify-end"><button className="swiss-button bg-black text-white hover:bg-[#e23221]" onClick={() => onReviewSuggestion(suggestion)}><CalendarDays className="h-4 w-4" /> Xem và tạo lịch hẹn</button><button className="swiss-button-outline text-neutral-600" onClick={() => onDismissSuggestion(suggestion.id)} disabled={dismissingSuggestionId === suggestion.id}>{dismissingSuggestionId === suggestion.id ? "Đang bỏ qua…" : "Bỏ qua đề xuất"}</button></div></article>)}</div>}
    </div>

    <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]">
      <div className="flex flex-col gap-4 border-b border-[#18211b] p-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mono-label text-neutral-500">INBOX</p><h3 className="mt-1 text-xl font-extrabold">Thư đến cần theo dõi</h3></div><div className="grid gap-2 sm:grid-cols-2"><label className="mono-label flex flex-col gap-1 text-neutral-500">Hộp thư<select className="input-swiss min-w-48 normal-case" value={accountFilter} onChange={event => onAccountFilter(event.target.value === "all" ? "all" : Number(event.target.value))}><option value="all">Tất cả hộp thư</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.email}</option>)}</select></label><label className="mono-label flex flex-col gap-1 text-neutral-500">Trạng thái<select className="input-swiss min-w-40 normal-case" value={statusFilter} onChange={event => onStatusFilter(event.target.value as EmailMessageStatus | "all")}><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabel).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label></div></div>
      <div className="border-b-2 border-[#e23221] bg-[#fff2ef] px-5 py-3"><p className="mono-label text-[#e23221]">GEMINI / OPT-IN</p><p className="mt-1 text-sm leading-5 text-neutral-700">Gemini miễn phí — tóm tắt theo yêu cầu</p><p className="mt-1 text-xs leading-5 text-neutral-600">Chỉ gửi tiêu đề, người gửi và phần xem trước của thư Gmail bạn bấm tóm tắt tới Gemini. Không quét inbox tự động; bạn có thể tóm tắt các email đã chọn không giới hạn lượt trong ứng dụng.</p></div>
      {loading ? <div className="p-10 text-center text-sm text-neutral-500">Đang tải email…</div> : messages.length === 0 ? <div className="p-10 text-center"><p className="font-bold">Chưa có thư phù hợp</p><p className="mt-1 text-sm text-neutral-500">Hãy kết nối hộp thư và bấm Đồng bộ để cập nhật inbox.</p></div> : <div className="divide-y divide-[#18211b]/15">{messages.map(message => {
        const isGmail = accounts.find(account => account.id === message.emailAccountId)?.provider === "google";
        const geminiSummary = geminiSummaryByMessage.get(message.id);
        return <article key={message.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`mono-label px-2 py-1 ${message.status === "done" ? "bg-[#e4ff3f]" : "bg-neutral-100"}`}>{statusLabel[message.status]}</span>{!message.isRead && <span className="mono-label bg-[#ff5d3d] px-2 py-1 text-white">CHƯA ĐỌC</span>}{!isGmail && <span className="mono-label border border-neutral-300 px-2 py-1 text-neutral-500">Chỉ Gmail</span>}</div><h4 className="mt-2 truncate font-bold">{message.subject}</h4><p className="mt-1 truncate text-sm text-neutral-600">{message.senderName || message.senderEmail || "Không rõ người gửi"} · {formatDate(message.receivedAt)} {formatTime(message.receivedAt)}</p>{message.snippet && <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-500">{message.snippet}</p>}{geminiSummary && <div className="mt-3 border-l-2 border-[#e23221] bg-[#fbfbfa] p-3"><p className="mono-label text-[#e23221]">TÓM TẮT GEMINI</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-800">{geminiSummary.summary}</p><p className="mt-2 text-xs leading-5 text-neutral-500">Bản tóm tắt này được tạo từ tiêu đề và phần xem trước đã đồng bộ, có thể chưa phản ánh toàn bộ nội dung email.</p></div>}</div><div className="flex flex-wrap gap-2 lg:justify-end"><select className="input-swiss h-9 min-w-36 text-xs" value={message.status} onChange={event => onSetMessageStatus(message.id, event.target.value as EmailMessageStatus)} disabled={updatingMessageId === message.id}>{Object.entries(statusLabel).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>{isGmail && !geminiSummary && <button className="swiss-button bg-black text-white hover:bg-[#e23221]" onClick={() => onSummarizeGmail(message.id)} disabled={summarizingMessageId === message.id}>{summarizingMessageId === message.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{summarizingMessageId === message.id ? "Gemini đang tóm tắt…" : "Tóm tắt bằng Gemini"}</button>}{message.webLink && <a className="swiss-button-outline h-9" href={message.webLink} target="_blank" rel="noreferrer">Mở thư <ExternalLink className="h-3.5 w-3.5" /></a>}</div></article>;
      })}</div>}
    </div>
  </section>;
}

function pageTitle(view: View) {
  return ({
    dashboard: "Tổng quan hôm nay",
    tasks: "Công việc",
    calendar: "Lịch hẹn",
    notifications: "Trung tâm nhắc việc",
    email: "Quản trị email",
    profile: "Hồ sơ cá nhân",
  })[view];
}

/** Root workspace view for authenticated TaskFlow users. */
export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [view, setView] = useState<View>(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    return requestedView && ["dashboard", "tasks", "calendar", "notifications", "profile", "email"].includes(requestedView)
      ? requestedView as View
      : "dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [eventPrefill, setEventPrefill] = useState<EventPrefill | null>(null);
  const [pendingEmailSuggestionId, setPendingEmailSuggestionId] = useState<number | null>(null);
  const [telegramLinkCode, setTelegramLinkCode] = useState("");
  const [emailAccountFilter, setEmailAccountFilter] = useState<number | "all">("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState<EmailMessageRecord["status"] | "all">("all");
  const [notificationBellOpen, setNotificationBellOpen] = useState(false);
  const utils = trpc.useUtils();

  const dashboard = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const taskQuery = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const eventQuery = trpc.calendar.list.useQuery(undefined, { enabled: isAuthenticated });
  const notifications = trpc.notifications.due.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const notifiedIds = useRef(new Set<number>());

  useEffect(() => {
    applyLanguageToDocument(language);
    const observer = new MutationObserver(() => applyLanguageToDocument(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    const dueItems = (notifications.data ?? []) as NotificationRecord[];
    dueItems.forEach(item => {
      if (notifiedIds.current.has(item.id)) return;
      notifiedIds.current.add(item.id);
      toast(item.title, { description: item.body ?? "Bạn có một nhắc việc mới." });
    });
  }, [notifications.data]);

  const invalidateWorkspace = async () => {
    await Promise.all([
      utils.dashboard.overview.invalidate(),
      utils.tasks.list.invalidate(),
      utils.calendar.list.invalidate(),
      utils.notifications.due.invalidate(),
    ]);
  };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); setTaskDialogOpen(false); toast.success("Đã tạo công việc"); },
    onError: error => toast.error(error.message),
  });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); setTaskDialogOpen(false); setEditingTask(null); toast.success("Đã cập nhật công việc"); },
    onError: error => toast.error(error.message),
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); toast.success("Đã xóa công việc"); },
    onError: error => toast.error(error.message),
  });
  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); setEventDialogOpen(false); setEditingEvent(null); toast.success("Đã cập nhật lịch hẹn"); },
    onError: error => toast.error(error.message),
  });
  const deleteEvent = trpc.calendar.delete.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); toast.success("Đã xóa lịch hẹn"); },
    onError: error => toast.error(error.message),
  });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.due.invalidate() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => utils.notifications.due.invalidate() });
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); toast.success("Thông tin hồ sơ đã được lưu"); },
    onError: error => toast.error(error.message),
  });
  const telegramStatus = trpc.telegram.status.useQuery(undefined, { enabled: isAuthenticated });
  const telegramHistory = trpc.telegram.deliveryHistory.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const emailConfiguration = trpc.email.configuration.useQuery(undefined, { enabled: isAuthenticated });
  const emailAccounts = trpc.email.accounts.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const emailMessagesInput = useMemo(() => ({
    accountId: emailAccountFilter === "all" ? undefined : emailAccountFilter,
    status: emailStatusFilter === "all" ? undefined : emailStatusFilter,
    limit: 100,
  }), [emailAccountFilter, emailStatusFilter]);
  const emailMessages = trpc.email.messages.useQuery(emailMessagesInput, { enabled: isAuthenticated, refetchInterval: 30000, refetchOnWindowFocus: true });
  const emailSuggestions = trpc.email.suggestions.useQuery({ status: "pending" }, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const emailGeminiSummaries = trpc.email.geminiSummaries.useQuery({ limit: 100 }, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const emailAiOverview = trpc.email.aiOverview.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: true });
  const beginTelegramLink = trpc.telegram.beginLink.useMutation({
    onSuccess: async data => { setTelegramLinkCode(data.code); await telegramStatus.refetch(); toast.success("Đã tạo mã liên kết Telegram"); },
    onError: error => toast.error(error.message),
  });
  const confirmTelegramLink = trpc.telegram.confirmLink.useMutation({
    onSuccess: async data => {
      if (data.connected) { setTelegramLinkCode(""); toast.success("Telegram đã được liên kết"); await telegramStatus.refetch(); }
      else toast.info("Chưa tìm thấy mã. Hãy gửi mã hiển thị bên dưới vào cuộc trò chuyện với Bot.");
    },
    onError: error => toast.error(error.message),
  });
  const refreshEmailData = async () => {
    await Promise.all([utils.email.accounts.invalidate(), utils.email.messages.invalidate(), utils.email.suggestions.invalidate(), utils.email.geminiSummaries.invalidate(), utils.email.aiOverview.invalidate()]);
  };
  const syncEmailMailbox = trpc.email.sync.useMutation({
    onSuccess: async data => { await refreshEmailData(); toast.success(`Đã đồng bộ ${data.count} email`); },
    onError: error => toast.error(error.message),
  });
  const connectGmailImap = trpc.email.connectGmailImap.useMutation({
    onSuccess: async () => { await refreshEmailData(); toast.success("Đã kết nối Gmail qua IMAP"); },
    onError: error => toast.error(error.message),
  });
  const disconnectEmailMailbox = trpc.email.disconnect.useMutation({
    onSuccess: async () => { await refreshEmailData(); setEmailAccountFilter("all"); toast.success("Đã ngắt kết nối hộp thư"); },
    onError: error => toast.error(error.message),
  });
  const updateEmailMessageStatus = trpc.email.updateMessageStatus.useMutation({
    onSuccess: async () => { await utils.email.messages.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const configureEmailAiSync = trpc.email.configureAiSync.useMutation({
    onSuccess: async () => { await refreshEmailData(); toast.success("Đã lưu cấu hình quét AI"); },
    onError: error => toast.error(error.message),
  });
  const analyzeEmailMailbox = trpc.email.analyze.useMutation({
    onSuccess: async data => { await refreshEmailData(); toast.success(`AI đã phân tích ${data.analyzed} email mới`); },
    onError: error => toast.error(error.message),
  });
  const summarizeEmailWithGemini = trpc.email.summarizeWithGemini.useMutation({
    onSuccess: async () => { await refreshEmailData(); toast.success("Tóm tắt Gemini đã sẵn sàng"); },
    onError: error => toast.error(error.message),
  });
  const dismissEmailSuggestion = trpc.email.dismissSuggestion.useMutation({
    onSuccess: async () => { await utils.email.suggestions.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const acceptEmailSuggestion = trpc.email.acceptSuggestion.useMutation({
    onSuccess: async () => { await utils.email.suggestions.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: async data => {
      await invalidateWorkspace();
      if (pendingEmailSuggestionId) await acceptEmailSuggestion.mutateAsync({ id: pendingEmailSuggestionId, calendarEventId: data.id });
      setEventDialogOpen(false); setEventPrefill(null); setPendingEmailSuggestionId(null); toast.success("Đã tạo lịch hẹn");
    },
    onError: error => toast.error(error.message),
  });
  const connectMicrosoftImap = () => {
    if (!emailConfiguration.data?.microsoft) { toast.error("Cần cấu hình OAuth Microsoft trước khi kết nối"); return; }
    window.location.assign("/api/email/oauth/microsoft/start");
  };

  const openCreateTask = () => { setEditingTask(null); setTaskDialogOpen(true); };
  const openCreateEvent = () => { setEditingEvent(null); setEventPrefill(null); setPendingEmailSuggestionId(null); setEventDialogOpen(true); };
  const openCreateEventFromTask = (task: TaskRecord) => { setEditingEvent(null); setEventPrefill(eventPrefillFromTask(task)); setEventDialogOpen(true); };
  const openEditTask = (task: TaskRecord) => { setEditingTask(task); setTaskDialogOpen(true); };
  const openEditEvent = (event: EventRecord) => {
    if (event.isRecurringOccurrence && event.seriesStartAt && event.seriesEndAt) {
      const occurrenceOffset = new Date(event.startAt).getTime() - new Date(event.seriesStartAt).getTime();
      setEditingEvent({ ...event, startAt: event.seriesStartAt, endAt: event.seriesEndAt, reminderAt: event.reminderAt ? new Date(new Date(event.reminderAt).getTime() - occurrenceOffset) : null });
    } else setEditingEvent(event);
    setEventDialogOpen(true);
  };
  const openCreateEventFromSuggestion = (suggestion: EmailEventSuggestionRecord) => {
    const reminderAt = suggestion.reminderMinutes > 0 ? new Date(new Date(suggestion.startAt).getTime() - suggestion.reminderMinutes * 60_000) : null;
    const source = [`Nguồn email: ${suggestion.emailSubject}`, suggestion.planLink ? `Liên kết kế hoạch: ${suggestion.planLink}` : null].filter(Boolean).join("\n");
    setEditingEvent(null);
    setEventPrefill({ title: suggestion.title, description: [suggestion.description, source].filter(Boolean).join("\n\n") || null, startAt: new Date(suggestion.startAt), endAt: new Date(suggestion.endAt), reminderAt });
    setPendingEmailSuggestionId(suggestion.id);
    setEventDialogOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen swiss-grid grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!user) {
    return <LoginLanding />;
  }

  const taskData = (taskQuery.data ?? []) as TaskRecord[];
  const eventData = (eventQuery.data ?? []) as EventRecord[];
  const notificationData = (notifications.data ?? []) as NotificationRecord[];
  const emailAccountData = (emailAccounts.data ?? []) as EmailAccountRecord[];
  const emailMessageData = (emailMessages.data ?? []) as EmailMessageRecord[];
  const notificationBellData = getNotificationBellData(emailMessageData, notificationData);

  return (
    <div className="app-shell min-h-screen text-[#18211b]">
      <div className="flex min-h-screen">
        <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-20 items-center justify-between border-b border-[var(--line)] px-5">
            <button type="button" onClick={() => setView("dashboard")} className="flex items-center gap-3 text-left">
              <span className="red-block grid h-9 w-9 place-items-center text-lg font-semibold text-white">T</span>
              <span className="leading-none"><span className="block text-[17px] font-semibold tracking-[-0.04em] text-[var(--ink)]">TaskFlow</span><span className="mono-label mt-1.5 block text-[var(--ink-muted)]">Focus workspace</span></span>
            </button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-[var(--ink-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X className="h-5 w-5" /></button>
          </div>
          <nav className="p-3 pt-5" aria-label="Điều hướng chính">
            <p className="mono-label mb-3 px-3 text-[var(--ink-muted)]">Bảng điều khiển</p>
            {navigation.map(item => {
              const Icon = item.icon;
              const count = item.id === "notifications" ? notificationData.length : undefined;
              return <button type="button" key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} className={`nav-item ${view === item.id ? "active" : ""}`}>
                <Icon className="h-4 w-4" /> <span className="flex-1">{item.label}</span>{count ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--terracotta)] px-1 text-[10px] font-bold text-white">{count}</span> : null}
              </button>;
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--line)] bg-[rgb(250_248_244/0.86)] p-3">
            <button type="button" onClick={() => setView("profile")} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-[var(--surface)]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ink)] text-sm font-semibold text-white">{user.name?.[0]?.toUpperCase() ?? "U"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name || "Tài khoản của bạn"}</span><span className="mt-1 block truncate text-[11px] text-[var(--ink-muted)]">{user.email || "Chưa có email"}</span></span>
              <ChevronDown className="h-4 w-4 text-[var(--ink-muted)]" />
            </button>
          </div>
        </aside>
        {sidebarOpen && <button type="button" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/25 lg:hidden" aria-label="Đóng lớp phủ" />}

        <main className="min-w-0 flex-1">
          <header className="app-header flex min-h-20 items-center justify-between gap-3 px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-3 md:gap-4"><button type="button" onClick={() => setSidebarOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] shadow-sm lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="mono-label hidden text-[var(--ink-muted)] sm:block">Không gian cá nhân / 2026</p><h1 className="truncate font-display text-2xl tracking-[-0.035em] text-[var(--ink)] md:text-[28px]">{pageTitle(view)}</h1></div></div>
            <div className="flex items-center gap-2 sm:gap-3"><div className="flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-sm" aria-label="Chọn ngôn ngữ"><button type="button" onClick={() => setLanguage("vi")} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${language === "vi" ? "bg-[var(--ink)] text-white" : "text-[var(--ink-muted)] hover:bg-[var(--surface-soft)]"}`}>VI</button><button type="button" onClick={() => setLanguage("en")} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${language === "en" ? "bg-[var(--ink)] text-white" : "text-[var(--ink-muted)] hover:bg-[var(--surface-soft)]"}`}>EN</button></div><NotificationBell open={notificationBellOpen} onOpenChange={setNotificationBellOpen} emails={notificationBellData.newEmails} dueNotifications={notificationBellData.dueNotifications} onOpenEmail={() => setView("email")} onOpenReminders={() => setView("notifications")} onMarkAllRead={() => markAllRead.mutate()} /><p className="hidden max-w-44 text-right text-xs font-medium capitalize leading-5 text-[var(--ink-muted)] xl:block">{new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</p><button type="button" onClick={view === "calendar" ? openCreateEvent : openCreateTask} className="swiss-button"><Plus className="h-4 w-4" /> <span className="hidden md:inline">{view === "calendar" ? "Lịch hẹn" : "Công việc"}</span></button></div>
          </header>

          <div className="mx-auto w-full max-w-[1440px] p-4 pb-10 md:p-8 lg:p-10">
            {view === "dashboard" && <DashboardView data={dashboard.data} aiOverview={emailAiOverview.data as EmailAiOverviewData | undefined} loading={dashboard.isLoading || emailAiOverview.isLoading} onOpenTasks={() => setView("tasks")} onOpenCalendar={() => setView("calendar")} onOpenEmail={() => setView("email")} onCreateTask={openCreateTask} onEditTask={openEditTask} />}
            {view === "tasks" && <TasksView tasks={taskData} onCreate={openCreateTask} onEdit={openEditTask} onSchedule={openCreateEventFromTask} onDelete={id => deleteTask.mutate({ id })} onToggleDone={task => updateTask.mutate({ id: task.id, data: { title: task.title, description: task.description, status: task.status === "done" ? "todo" : "done", priority: task.priority, dueAt: asDate(task.dueAt), reminderAt: asDate(task.reminderAt) } })} />}
            {view === "calendar" && <CalendarView events={eventData} tasks={taskData} onCreate={openCreateEvent} onEdit={openEditEvent} onDelete={id => deleteEvent.mutate({ id })} />}
            {view === "notifications" && <NotificationsView notifications={notificationData} onRead={id => markRead.mutate({ id })} onReadAll={() => markAllRead.mutate()} />}
            {view === "email" && <EmailManager
              configuration={emailConfiguration.data}
              accounts={emailAccountData}
              messages={emailMessageData}
              suggestions={(emailSuggestions.data ?? []) as EmailEventSuggestionRecord[]}
              geminiSummaries={(emailGeminiSummaries.data ?? []) as EmailGeminiSummaryRecord[]}
              aiOverview={emailAiOverview.data as EmailAiOverviewData | undefined}
              loading={emailAccounts.isLoading || emailMessages.isLoading}
              accountFilter={emailAccountFilter}
              statusFilter={emailStatusFilter}
              syncingAccountId={syncEmailMailbox.isPending ? syncEmailMailbox.variables?.id : null}
              disconnectingAccountId={disconnectEmailMailbox.isPending ? disconnectEmailMailbox.variables?.id : null}
              updatingMessageId={updateEmailMessageStatus.isPending ? updateEmailMessageStatus.variables?.id : null}
              configuringAccountId={configureEmailAiSync.isPending ? configureEmailAiSync.variables?.id : null}
              analyzingAccountId={analyzeEmailMailbox.isPending ? analyzeEmailMailbox.variables?.id : null}
              dismissingSuggestionId={dismissEmailSuggestion.isPending ? dismissEmailSuggestion.variables?.id : null}
              summarizingMessageId={summarizeEmailWithGemini.isPending ? summarizeEmailWithGemini.variables?.messageId : null}
              connectingGmail={connectGmailImap.isPending}
              onAccountFilter={setEmailAccountFilter}
              onStatusFilter={setEmailStatusFilter}
              onConnectGmail={input => connectGmailImap.mutate(input)}
              onConnectMicrosoft={connectMicrosoftImap}
              onSync={(id: number) => syncEmailMailbox.mutate({ id })}
              onDisconnect={(id: number) => { if (window.confirm("Ngắt kết nối hộp thư này?")) disconnectEmailMailbox.mutate({ id }); }}
              onSetMessageStatus={(id: number, status: EmailMessageStatus) => updateEmailMessageStatus.mutate({ id, status })}
              onConfigureAiSync={(id: number, enabled: boolean, intervalMinutes: number) => configureEmailAiSync.mutate({ id, enabled, intervalMinutes: String(intervalMinutes) as "15" | "30" | "60" | "120" | "240" | "720" | "1440" })}
              onAnalyze={(id: number) => analyzeEmailMailbox.mutate({ id })}
              onReviewSuggestion={openCreateEventFromSuggestion}
              onDismissSuggestion={(id: number) => dismissEmailSuggestion.mutate({ id })}
              onSummarizeGmail={(messageId: number) => {
                if (!window.confirm("Đồng ý gửi tiêu đề, người gửi và phần xem trước của thư này tới Gemini miễn phí? Google có thể xử lý dữ liệu theo điều khoản của dịch vụ miễn phí. Không gửi email nhạy cảm.")) return;
                summarizeEmailWithGemini.mutate({ messageId, locale: language, acknowledgeUnpaidDataUse: true });
              }}
            />}
            {view === "profile" && <ProfileView name={user.name ?? ""} email={user.email ?? ""} saving={updateProfile.isPending} onSave={data => updateProfile.mutate(data)} onLogout={logout} telegram={telegramStatus.data} telegramHistory={(telegramHistory.data ?? []) as TelegramDeliveryLogRecord[]} linkCode={telegramLinkCode} linking={beginTelegramLink.isPending || confirmTelegramLink.isPending} onBeginTelegramLink={() => beginTelegramLink.mutate()} onConfirmTelegramLink={() => confirmTelegramLink.mutate()} />}
          </div>
        </main>
      </div>

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={editingTask} saving={createTask.isPending || updateTask.isPending} onSave={data => editingTask ? updateTask.mutate({ id: editingTask.id, data }) : createTask.mutate(data)} />
      <EventDialog open={eventDialogOpen} onOpenChange={open => { setEventDialogOpen(open); if (!open) { setEventPrefill(null); setPendingEmailSuggestionId(null); } }} event={editingEvent} prefill={eventPrefill} saving={createEvent.isPending || updateEvent.isPending} onSave={data => editingEvent ? updateEvent.mutate({ id: editingEvent.id, data }) : createEvent.mutate(data)} />
    </div>
  );
}

function LoginLanding() {
  return <div className="login-shell min-h-screen p-4 md:p-8">
    <div className="login-card mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl grid-cols-1 overflow-hidden rounded-[28px] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative flex flex-col justify-between overflow-hidden border-b border-[var(--line)] p-7 md:p-12 lg:border-b-0 lg:border-r">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[var(--line)] opacity-60" />
        <div className="relative flex items-center gap-3"><span className="red-block grid h-10 w-10 place-items-center text-xl font-semibold text-white">T</span><span className="text-xl font-semibold tracking-[-0.045em] text-[var(--ink)]">TaskFlow</span></div>
        <div className="relative py-16 lg:py-20"><p className="mono-label mb-6 text-[var(--sage)]">Lập kế hoạch cá nhân — 01</p><h1 className="max-w-2xl font-display text-5xl leading-[0.96] tracking-[-0.05em] text-[var(--ink)] md:text-7xl">Tổ chức công việc.<br /><span className="italic text-[var(--terracotta)]">Rõ ràng</span> từng ngày.</h1><p className="mt-8 max-w-lg text-base leading-7 text-[var(--ink-muted)]">Không gian cá nhân cho công việc, lịch hẹn và nhắc việc — được thiết kế trên một hệ lưới trực quan và chính xác.</p><div className="mt-10 flex flex-wrap gap-2"><span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">Công việc</span><span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">Lịch hẹn</span><span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-muted)]">Nhắc việc</span></div></div>
        <p className="mono-label relative text-[var(--ink-muted)]">TaskFlow / 2026</p>
      </section>
      <section className="flex flex-col justify-center bg-[var(--ink)] p-8 text-white md:p-12 lg:p-14"><span className="mb-10 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--terracotta)] shadow-[0_12px_30px_rgb(0_0_0/0.18)]"><ShieldCheck className="h-5 w-5" /></span><p className="mono-label text-white/50">Đăng nhập an toàn</p><h2 className="mt-3 font-display text-4xl tracking-[-0.035em] text-white">Sẵn sàng bắt đầu?</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">Dữ liệu công việc và lịch hẹn được tách biệt theo tài khoản Manus của bạn.</p><button type="button" onClick={() => startLogin()} className="mt-10 flex min-h-14 w-full items-center justify-between rounded-xl border border-white/10 bg-[#fdfcf9] px-5 py-4 text-left text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--terracotta-soft)]"><span>Tiếp tục với Manus</span><ArrowRight className="h-5 w-5 text-[var(--terracotta)]" /></button><p className="mt-5 text-[11px] leading-5 text-white/45">Bằng việc tiếp tục, bạn sử dụng luồng xác thực Manus OAuth để truy cập không gian cá nhân của mình.</p></section>
    </div>
  </div>;
}

function DashboardView({ data, aiOverview, loading, onOpenTasks, onOpenCalendar, onOpenEmail, onCreateTask, onEditTask }: { data: any; aiOverview?: EmailAiOverviewData; loading: boolean; onOpenTasks: () => void; onOpenCalendar: () => void; onOpenEmail: () => void; onCreateTask: () => void; onEditTask: (task: TaskRecord) => void }) {
  const { language } = useLanguage();
  const stats = data?.stats ?? { total: 0, completed: 0, inProgress: 0, completionRate: 0 };
  const todayTasks = (data?.todayTasks ?? []) as TaskRecord[];
  const upcomingTasks = (data?.upcomingTasks ?? []) as TaskRecord[];
  const upcomingEvents = (data?.upcomingEvents ?? []) as EventRecord[];
  const recentAiSummaries = aiOverview?.recentSummaries ?? [];
  if (loading) return <div className="grid h-80 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <div className="mx-auto max-w-7xl enter-up"><section className="grid overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_55px_rgb(75_59_45/0.08)] lg:grid-cols-[1.36fr_0.64fr]"><div className="relative overflow-hidden border-b border-[var(--line)] p-6 md:p-9 lg:border-b-0 lg:border-r"><div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[var(--terracotta-soft)] opacity-80" /><p className="mono-label relative text-[var(--sage)]">Tình hình hôm nay</p><h2 className="relative mt-5 max-w-2xl pr-10 font-display text-4xl leading-[0.98] tracking-[-0.045em] text-[var(--ink)] md:text-[52px]">Làm việc có chủ đích, không chỉ bận rộn.</h2><div className="relative mt-11 flex flex-wrap items-end gap-5"><div><p className="font-display text-6xl leading-none tracking-[-0.06em] text-[var(--terracotta-dark)]">{stats.completionRate}<span className="ml-1 text-3xl">%</span></p><p className="mono-label mt-3 text-[var(--ink-muted)]">Tỷ lệ hoàn thành</p></div><div className="mb-1 hidden h-14 w-px bg-[var(--line-strong)] sm:block" /><p className="mb-1 max-w-[170px] text-xs leading-5 text-[var(--ink-muted)]">{language === "en" ? `${stats.completed}/${stats.total} tasks completed in your workspace.` : `${stats.completed}/${stats.total} công việc đã hoàn thành trong không gian của bạn.`}</p></div></div><div className="bg-[var(--ink)] p-6 text-white md:p-8"><p className="mono-label text-white/50">Thao tác nhanh</p><button onClick={onCreateTask} className="mt-7 flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] p-4 text-left text-sm font-semibold transition hover:border-[var(--terracotta)] hover:bg-[var(--terracotta)]"><span>Tạo công việc mới</span><Plus className="h-5 w-5" /></button><button onClick={onOpenCalendar} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/15 p-4 text-left text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"><span>Xem lịch hẹn</span><CalendarDays className="h-5 w-5" /></button><div className="mt-8 border-t border-white/15 pt-5"><p className="font-display text-4xl tracking-[-0.04em]">{stats.inProgress.toString().padStart(2, "0")}</p><p className="mono-label mt-1 text-white/50">Đang thực hiện</p></div></div></section>
  <section className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_0.9fr]"><div className="border border-black bg-white"><SectionHeader index="01" title="Việc cần làm hôm nay" action="Xem tất cả" onAction={onOpenTasks} />{todayTasks.length ? <div>{todayTasks.map(task => <TaskLine key={task.id} task={task} onEdit={() => onEditTask(task)} />)}</div> : <EmptyLine text="Không còn việc nào đến hạn hôm nay." onAction={onCreateTask} action="Tạo công việc" />}</div><div className="border border-black bg-white"><SectionHeader index="02" title="Lịch hẹn sắp tới" action="Mở lịch" onAction={onOpenCalendar} />{upcomingEvents.length ? <div>{upcomingEvents.map(event => <div key={event.id} className="flex gap-4 border-b border-black p-4 last:border-b-0"><div className="w-12 shrink-0 border-r border-black pr-3 text-center"><p className="text-xl font-bold leading-none">{new Date(event.startAt).getDate()}</p><p className="mono-label mt-1 text-neutral-500">{new Intl.DateTimeFormat(getAppLocale(), { month: "short" }).format(new Date(event.startAt))}</p></div><div><p className="font-bold tracking-[-0.03em]">{event.title}</p><p className="mt-1 text-xs text-neutral-500">{formatTime(event.startAt)} — {formatTime(event.endAt)}</p></div></div>)}</div> : <EmptyLine text="Chưa có lịch hẹn nào sắp diễn ra." onAction={onOpenCalendar} action="Tạo lịch hẹn" />}</div></section>
  <section className="mt-7 border border-black bg-[#fff2ef]"><SectionHeader index="03" title={language === "en" ? "Latest AI email" : "Email AI mới nhất"} action={language === "en" ? "Open email manager" : "Mở Quản trị email"} onAction={onOpenEmail} />{recentAiSummaries.length ? <div className="grid lg:grid-cols-3">{recentAiSummaries.slice(0, 3).map((summary, index) => <button key={summary.id} onClick={onOpenEmail} className={`group min-w-0 p-5 text-left transition hover:bg-white ${index > 0 ? "border-t border-black lg:border-l lg:border-t-0" : ""}`}><div className="flex items-center justify-between gap-3"><span className="mono-label text-[#e23221]">{language === "en" ? "GEMINI / AI" : "GEMINI / AI"}</span><Mail className="h-4 w-4 shrink-0 transition group-hover:text-[#e23221]" /></div><p className="mt-5 truncate text-base font-bold tracking-[-0.04em]">{summary.emailSubject || (language === "en" ? "No subject" : "Không có tiêu đề")}</p><p className="mt-1 truncate text-xs text-neutral-500">{summary.senderName || "—"} · {formatDate(summary.generatedAt, { day: "2-digit", month: "short" })}</p><p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-700">{summary.summary}</p><span className="mono-label mt-5 inline-flex border-b border-black pb-0.5 group-hover:border-[#e23221] group-hover:text-[#e23221]">{language === "en" ? "AI summarized" : "AI đã tóm tắt"}</span></button>)}</div> : <EmptyLine text={language === "en" ? "No emails have been summarized by AI yet." : "Chưa có email nào được AI tóm tắt."} onAction={onOpenEmail} action={language === "en" ? "Open email manager" : "Mở Quản trị email"} />}</section>
  {upcomingTasks.length > 0 && <section className="mt-7 border border-black bg-[#f1f1ed]"><SectionHeader index="04" title="Tiếp theo" /><div className="grid md:grid-cols-2 xl:grid-cols-3">{upcomingTasks.map(task => <div key={task.id} className="border-b border-black p-5 last:border-b-0 md:border-b-0 md:border-r xl:last:border-r-0"><PriorityMark priority={task.priority} /><p className="mt-7 text-lg font-bold tracking-[-0.05em]">{task.title}</p><p className="mt-2 text-xs text-neutral-500">Đến hạn: {formatDate(task.dueAt)}</p></div>)}</div></section>}</div>;
}

function SectionHeader({ index, title, action, onAction }: { index: string; title: string; action?: string; onAction?: () => void }) { return <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4"><div className="flex items-center gap-3"><span className="mono-label text-[var(--terracotta)]">{index}</span><h3 className="font-display text-lg tracking-[-0.025em]">{title}</h3></div>{action && <button onClick={onAction} className="text-xs font-semibold text-[var(--ink-muted)] transition hover:text-[var(--terracotta)]">{action}</button>}</div>; }
function EmptyLine({ text, action, onAction }: { text: string; action: string; onAction: () => void }) { return <div className="p-8"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-soft)]"><Circle className="h-4 w-4 text-[var(--ink-muted)]" /></span><p className="mt-4 text-sm text-[var(--ink-muted)]">{text}</p><button onClick={onAction} className="mt-5 text-xs font-semibold text-[var(--terracotta)] transition hover:text-[var(--terracotta-dark)]">{action}</button></div>; }
function PriorityMark({ priority }: { priority: Priority }) { return <span className={`inline-block h-2.5 w-2.5 rounded-full ${priority === "high" ? "bg-[var(--terracotta)]" : priority === "medium" ? "bg-amber-400" : "bg-[var(--sage)]"}`} />; }
function TaskLine({ task, onEdit }: { task: TaskRecord; onEdit: () => void }) { return <button onClick={onEdit} className="flex w-full items-center gap-3 border-b border-[var(--line)] p-4 text-left transition last:border-b-0 hover:bg-[var(--surface-soft)]"><PriorityMark priority={task.priority} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold tracking-[-0.02em]">{task.title}</p><p className="mt-1 text-[11px] text-[var(--ink-muted)]">{formatDate(task.dueAt, { weekday: "short", day: "2-digit", month: "short" })}</p></div><StatusBadge status={task.status} /></button>; }
function StatusBadge({ status }: { status: TaskStatus }) { return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusMeta[status].className}`}>{statusMeta[status].label}</span>; }

function TasksView({ tasks, onCreate, onEdit, onSchedule, onDelete, onToggleDone }: { tasks: TaskRecord[]; onCreate: () => void; onEdit: (task: TaskRecord) => void; onSchedule: (task: TaskRecord) => void; onDelete: (id: number) => void; onToggleDone: (task: TaskRecord) => void }) {
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const visibleTasks = tasks.filter(task => (statusFilter === "all" || task.status === statusFilter) && (priorityFilter === "all" || task.priority === priorityFilter));
  return <div className="mx-auto max-w-7xl enter-up"><section className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]"><div className="grid border-b border-[var(--line)] lg:grid-cols-[1fr_auto]"><div className="p-5 md:p-7"><p className="mono-label text-[var(--sage)]">Danh sách / {tasks.length.toString().padStart(2, "0")}</p><h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">Mọi công việc, cùng một nhịp.</h2></div><div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] p-4 lg:border-l lg:border-t-0"><FilterSelect label="Trạng thái" value={statusFilter} onChange={value => setStatusFilter(value as "all" | TaskStatus)} options={[["all", "Tất cả"], ["todo", "Chưa làm"], ["in_progress", "Đang làm"], ["done", "Hoàn thành"]]} /><FilterSelect label="Ưu tiên" value={priorityFilter} onChange={value => setPriorityFilter(value as "all" | Priority)} options={[["all", "Mọi mức"], ["high", "Cao"], ["medium", "Trung bình"], ["low", "Thấp"]]} /><button onClick={onCreate} className="swiss-button" aria-label="Thêm công việc"><Plus className="h-4 w-4" /></button></div></div>
  {visibleTasks.length ? <div>{visibleTasks.map(task => <div key={task.id} className="group grid items-center gap-4 border-b border-[var(--line)] p-4 transition last:border-b-0 hover:bg-[var(--surface-soft)] md:grid-cols-[30px_1fr_120px_120px_175px]"><button onClick={() => onToggleDone(task)} className={`grid h-7 w-7 place-items-center rounded-full border transition ${task.status === "done" ? "border-[var(--sage)] bg-[var(--sage)] text-white" : "border-[var(--line-strong)] bg-[var(--surface)] hover:border-[var(--sage)] hover:text-[var(--sage)]"}`} aria-label="Đánh dấu hoàn thành">{task.status === "done" && <Check className="h-4 w-4" />}</button><button onClick={() => onEdit(task)} className="min-w-0 text-left"><div className="flex items-center gap-2"><PriorityMark priority={task.priority} /><p className={`truncate text-sm font-semibold tracking-[-0.02em] ${task.status === "done" ? "text-neutral-400 line-through" : ""}`}>{task.title}</p></div>{task.description && <p className="mt-1 truncate pl-5 text-xs text-[var(--ink-muted)]">{task.description}</p>}</button><div><p className="mono-label text-neutral-400 md:hidden">Hạn</p><p className="text-xs text-[var(--ink-muted)]">{formatDate(task.dueAt, { day: "2-digit", month: "short" })}</p></div><div><p className="mono-label text-neutral-400 md:hidden">Trạng thái</p><StatusBadge status={task.status} /></div><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityMeta[task.priority].className}`}>{priorityMeta[task.priority].label}</span><div className="flex items-center gap-1"><button onClick={() => onSchedule(task)} className="flex min-h-8 items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]" aria-label="Đặt lịch hẹn từ công việc"><CalendarDays className="h-3.5 w-3.5" /><span className="hidden lg:inline">Đặt lịch hẹn</span></button><button onClick={() => onDelete(task.id)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ink-muted)] opacity-100 transition hover:bg-[var(--terracotta-soft)] hover:text-[var(--terracotta)] md:opacity-0 md:group-hover:opacity-100" aria-label="Xóa công việc"><Trash2 className="h-4 w-4" /></button></div></div></div>)}</div> : <div className="p-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--surface-soft)]"><ClipboardList className="h-6 w-6 text-[var(--ink-muted)]" /></span><p className="mt-4 font-semibold">Chưa có công việc phù hợp</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Thử thay đổi bộ lọc hoặc thêm công việc đầu tiên của bạn.</p><button onClick={onCreate} className="swiss-button mt-6"><Plus className="h-4 w-4" /> Thêm công việc</button></div>}</section></div>;
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="relative"><span className="sr-only">{label}</span><select className="h-10 appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] py-0 pl-3 pr-9 text-xs font-semibold text-[var(--ink)] shadow-sm outline-none transition hover:border-[var(--line-strong)] focus:border-[var(--terracotta)] focus:shadow-[0_0_0_3px_rgb(197_101_71/0.12)]" value={value} onChange={event => onChange(event.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-[var(--ink-muted)]" /></label>; }

function LunarDateLabel({ date, compact = false, inverse = false }: { date: Date; compact?: boolean; inverse?: boolean }) {
  const { language } = useLanguage();
  const info = getVietnameseCalendarDay(date, language);
  return <div className={`mt-0.5 leading-tight ${compact ? "text-[9px]" : "text-[11px]"} ${inverse ? "text-white/65" : "text-neutral-500"}`}><span className="mono-label normal-case tracking-normal">{info.lunarLabel}</span>{info.holiday && <span className={`ml-1 inline-block font-bold ${inverse ? "text-[#e4ff3f]" : "text-[#e23221]"}`}>{info.holiday.label}</span>}</div>;
}

function CalendarView({ events, tasks, onCreate, onEdit, onDelete }: { events: EventRecord[]; tasks: TaskRecord[]; onCreate: () => void; onEdit: (event: EventRecord) => void; onDelete: (id: number) => void }) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const calendarDays = useMemo(() => monthGrid(cursor), [cursor]);
  const selectedKey = localDayKey(selectedDay);
  const selectedEvents = events.filter(event => localDayKey(event.startAt) === selectedKey);
  const selectedTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === selectedKey);
  const heading = mode === "month" ? new Intl.DateTimeFormat(getAppLocale(), { month: "long", year: "numeric" }).format(cursor) : formatDate(selectedDay, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const shift = (amount: number) => { const next = new Date(mode === "month" ? cursor : selectedDay); if (mode === "month") next.setMonth(next.getMonth() + amount); else if (mode === "week") next.setDate(next.getDate() + amount * 7); else next.setDate(next.getDate() + amount); mode === "month" ? setCursor(next) : setSelectedDay(next); };
  return <div className="mx-auto max-w-7xl enter-up"><section className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]"><div className="flex flex-col justify-between border-b border-[var(--line)] md:flex-row"><div className="flex items-center gap-2 p-5"><button onClick={() => shift(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"><ArrowLeft className="h-4 w-4" /></button><button onClick={() => shift(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"><ArrowRight className="h-4 w-4" /></button><div className="ml-2"><p className="mono-label text-[var(--sage)]">Lịch cá nhân</p><h2 className="font-display text-3xl tracking-[-0.035em] capitalize">{heading}</h2></div></div><div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] p-4 md:border-l md:border-t-0"><div className="flex rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">{(["month", "week", "day"] as const).map(item => <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition ${mode === item ? "bg-[var(--ink)] text-white shadow-sm" : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"}`}>{item === "month" ? "Tháng" : item === "week" ? "Tuần" : "Ngày"}</button>)}</div><button onClick={onCreate} className="swiss-button"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Tạo lịch hẹn</span></button></div></div>
  {mode === "month" ? <div className="overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-7 border-b border-black">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <div key={day} className="border-r border-black p-2 text-center last:border-r-0"><span className="mono-label text-neutral-500">{day}</span></div>)}</div><div className="grid grid-cols-7">{calendarDays.map(day => { const key = localDayKey(day); const dayEvents = events.filter(event => localDayKey(event.startAt) === key); const dayTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === key); const isCurrent = day.getMonth() === cursor.getMonth(); const isToday = key === localDayKey(new Date()); return <button key={key} onClick={() => { setSelectedDay(day); setMode("day"); }} className={`min-h-28 border-b border-r border-black p-2 text-left last:border-r-0 hover:bg-[#f1f1ed] ${isCurrent ? "" : "bg-[#f5f5f2] text-neutral-400"}`}><span className={`grid h-6 w-6 place-items-center text-xs font-bold ${isToday ? "bg-[#e23221] text-white" : ""}`}>{day.getDate()}</span><LunarDateLabel date={day} compact /><div className="mt-1.5 space-y-1">{dayEvents.slice(0, 2).map(event => <span key={event.id} className="block truncate bg-black px-1.5 py-1 text-[10px] font-bold text-white">{event.title}</span>)}{dayTasks.slice(0, 1).map(task => <span key={task.id} className="block truncate border-l-[3px] border-[#e23221] bg-neutral-100 px-1.5 py-1 text-[10px] font-bold text-black">{task.title}</span>)}{dayEvents.length + dayTasks.length > 3 && <span className="mono-label text-neutral-500">+ {dayEvents.length + dayTasks.length - 3}</span>}</div></button>; })}</div></div></div> : mode === "week" ? <WeekAgenda anchor={selectedDay} events={events} tasks={tasks} onSelectDay={day => { setSelectedDay(day); setMode("day"); }} onEdit={onEdit} /> : <DayAgenda day={selectedDay} events={selectedEvents} tasks={selectedTasks} onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} />}</section></div>;
}
function monthGrid(cursor: Date) { const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); return Array.from({ length: 42 }, (_, index) => { const value = new Date(start); value.setDate(start.getDate() + index); return value; }); }
function weekDays(anchor: Date) { const start = new Date(anchor); const day = start.getDay() || 7; start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - day + 1); return Array.from({ length: 7 }, (_, index) => { const value = new Date(start); value.setDate(start.getDate() + index); return value; }); }
function WeekAgenda({ anchor, events, tasks, onSelectDay, onEdit }: { anchor: Date; events: EventRecord[]; tasks: TaskRecord[]; onSelectDay: (day: Date) => void; onEdit: (event: EventRecord) => void }) { const days = weekDays(anchor); const todayKey = localDayKey(new Date()); return <div className="overflow-x-auto"><div className="grid min-h-[480px] min-w-[840px] grid-cols-7">{days.map(day => { const key = localDayKey(day); const dayEvents = events.filter(event => localDayKey(event.startAt) === key); const dayTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === key); const isToday = key === todayKey; return <div key={key} className="border-r border-black last:border-r-0"><button onClick={() => onSelectDay(day)} className="w-full border-b border-black p-3 text-left hover:bg-[#f1f1ed]"><div className="flex items-end justify-between"><span className="mono-label text-neutral-500">{new Intl.DateTimeFormat(getAppLocale(), { weekday: "short" }).format(day)}</span><span className={`grid h-7 w-7 place-items-center text-sm font-bold ${isToday ? "bg-[#e23221] text-white" : ""}`}>{day.getDate()}</span></div><LunarDateLabel date={day} compact /></button><div className="min-h-[410px] space-y-2 p-2">{dayEvents.map(event => <button key={event.id} onClick={() => onEdit(event)} className="block w-full border border-black bg-black p-2 text-left text-white hover:bg-[#e23221]"><p className="text-[10px] font-bold">{formatTime(event.startAt)}</p><p className="mt-1 line-clamp-2 text-xs font-bold">{event.title}</p></button>)}{dayTasks.map(task => <button key={task.id} onClick={() => onSelectDay(day)} className="block w-full border-l-[3px] border-[#e23221] bg-[#f1f1ed] p-2 text-left hover:bg-white"><p className="line-clamp-2 text-xs font-bold">{task.title}</p><p className="mono-label mt-2 text-neutral-500">Hạn công việc</p></button>)}{!dayEvents.length && !dayTasks.length && <p className="mono-label px-1 pt-2 text-neutral-300">Trống</p>}</div></div>; })}</div></div>; }
function DayAgenda({ day, events, tasks, onCreate, onEdit, onDelete }: { day: Date; events: EventRecord[]; tasks: TaskRecord[]; onCreate: () => void; onEdit: (event: EventRecord) => void; onDelete: (id: number) => void }) { return <div className="grid min-h-[520px] md:grid-cols-[150px_1fr]"><div className="border-b border-black bg-[#f1f1ed] p-5 md:border-b-0 md:border-r"><p className="mono-label text-neutral-500">Ngày đã chọn</p><p className="mt-3 text-5xl font-bold tracking-[-0.08em]">{day.getDate()}</p><p className="mt-1 text-sm font-bold capitalize">{new Intl.DateTimeFormat(getAppLocale(), { month: "long", year: "numeric" }).format(day)}</p><LunarDateLabel date={day} /><div className="mt-10 space-y-3"><p className="mono-label text-neutral-500"><span>{events.length}</span>{" "}<span>sự kiện</span></p><p className="mono-label text-neutral-500"><span>{tasks.length}</span>{" "}<span>công việc</span></p></div></div><div>{events.length || tasks.length ? <div>{events.map(event => <div key={event.id} className="group grid gap-4 border-b border-black p-5 md:grid-cols-[104px_1fr_auto]"><div className="text-sm font-bold">{formatTime(event.startAt)}<span className="text-neutral-400"> — {formatTime(event.endAt)}</span></div><button onClick={() => onEdit(event)} className="text-left"><p className="font-bold tracking-[-0.04em]">{event.title}</p>{event.description && <p className="mt-1 text-xs text-neutral-500">{event.description}</p>}</button><button onClick={() => onDelete(event.id)} className="self-start p-1 text-neutral-500 opacity-100 hover:text-[#e23221] md:opacity-0 md:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div>)}{tasks.map(task => <div key={task.id} className="flex items-center gap-4 border-b border-black bg-[#f8f8f6] p-5"><PriorityMark priority={task.priority} /><div><p className="text-sm font-bold">{task.title}</p><p className="mt-1 text-[11px] text-neutral-500">Công việc đến hạn</p></div></div>)}</div> : <EmptyLine text="Ngày này chưa có lịch hẹn hay công việc đến hạn." action="Tạo lịch hẹn" onAction={onCreate} />}</div></div>; }

function NotificationsView({ notifications, onRead, onReadAll }: { notifications: NotificationRecord[]; onRead: (id: number) => void; onReadAll: () => void }) { return <div className="mx-auto max-w-4xl enter-up"><section className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.065)]"><div className="flex items-center justify-between gap-4 border-b border-[var(--line)] p-5 md:p-7"><div><p className="mono-label text-[var(--sage)]">Nhắc việc trong ứng dụng</p><h2 className="mt-1 font-display text-3xl tracking-[-0.035em]"><span>{notifications.length}</span>{" "}<span>điều cần chú ý</span></h2></div>{notifications.length > 0 && <button onClick={onReadAll} className="text-xs font-semibold text-[var(--ink-muted)] transition hover:text-[var(--terracotta)]">Đánh dấu đã đọc</button>}</div>{notifications.length ? <div>{notifications.map(item => <div key={item.id} className="group flex gap-4 border-b border-[var(--line)] p-5 transition last:border-b-0 hover:bg-[var(--surface-soft)]"><div className="red-block mt-1 grid h-9 w-9 shrink-0 place-items-center text-white"><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="font-semibold tracking-[-0.02em]">{item.title}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{item.body}</p><p className="mono-label mt-3 text-neutral-400">{formatDate(item.scheduledFor, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</p></div><button onClick={() => onRead(item.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] transition hover:border-[var(--sage)] hover:bg-[var(--sage-soft)] hover:text-[var(--sage)]" aria-label="Đánh dấu đã đọc"><Check className="h-4 w-4" /></button></div>)}</div> : <div className="p-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--sage-soft)]"><AlarmClock className="h-6 w-6 text-[var(--sage)]" /></span><p className="mt-4 font-semibold">Mọi thứ đều đúng nhịp</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Nhắc việc sẽ xuất hiện tại đây khi bạn đến thời điểm đã đặt.</p></div>}</section><p className="mt-4 px-2 text-xs leading-5 text-[var(--ink-muted)]">Nhắc việc được đồng bộ khi ứng dụng đang mở và cũng xuất hiện ngay khi bạn quay lại không gian làm việc.</p></div>; }

function ProfileView({ name, email, saving, onSave, onLogout, telegram, telegramHistory, linkCode, linking, onBeginTelegramLink, onConfirmTelegramLink }: { name: string; email: string; saving: boolean; onSave: (data: { name: string; email: string }) => void; onLogout: () => void; telegram?: { connected: boolean; pending: boolean; expiresAt: Date | null }; telegramHistory: TelegramDeliveryLogRecord[]; linkCode: string; linking: boolean; onBeginTelegramLink: () => void; onConfirmTelegramLink: () => void }) {
  const [form, setForm] = useState({ name, email });
  useEffect(() => setForm({ name, email }), [name, email]);
  return <div className="mx-auto max-w-4xl enter-up"><section className="grid overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_55px_rgb(75_59_45/0.08)] md:grid-cols-[0.65fr_1fr]"><div className="border-b border-white/10 bg-[var(--ink)] p-7 text-white md:border-b-0 md:border-r"><div className="red-block grid h-14 w-14 place-items-center text-2xl font-semibold">{form.name?.[0]?.toUpperCase() || "U"}</div><p className="mono-label mt-12 text-white/45">Tài khoản Manus</p><h2 className="mt-2 font-display text-4xl tracking-[-0.04em] text-white">Không gian của riêng bạn.</h2><p className="mt-5 text-sm leading-6 text-white/65">Thông tin này thuộc tài khoản hiện tại. Công việc, lịch hẹn và nhắc việc luôn được phân tách theo từng người đăng nhập.</p><button onClick={onLogout} className="mt-10 flex items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold text-white/70 transition hover:text-[var(--terracotta)]"><LogOut className="h-4 w-4" /> Đăng xuất</button></div><div className="p-7"><form onSubmit={event => { event.preventDefault(); onSave(form); }}><p className="mono-label text-[var(--sage)]">Thông tin hiển thị</p><h3 className="mt-1 font-display text-3xl tracking-[-0.035em]">Hồ sơ cá nhân</h3><label className="mt-8 block"><span className="mono-label mb-2 block">Tên hiển thị</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="swiss-input" placeholder="Tên của bạn" maxLength={120} /></label><label className="mt-5 block"><span className="mono-label mb-2 block">Địa chỉ email</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className="swiss-input" placeholder="you@example.com" required maxLength={320} /></label><button disabled={saving} className="swiss-button mt-8 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu thay đổi</button></form><section className="mt-8 border-t border-[var(--line)] pt-6"><div className="flex items-start justify-between gap-4"><div><p className="mono-label text-[var(--ink-muted)]">Kênh nhắc lịch</p><h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Telegram Bot</h4></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${telegram?.connected ? "bg-[var(--sage-soft)] text-[var(--sage)]" : "bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)]"}`}>{telegram?.connected ? "Đã liên kết" : "Chưa liên kết"}</span></div>{telegram?.connected ? <p className="mt-3 text-sm text-[var(--ink-muted)]">Lời nhắc Telegram sẽ được gửi riêng đến cuộc trò chuyện Bot này.</p> : <div className="mt-4"><p className="text-sm leading-6 text-[var(--ink-muted)]">Tạo mã, gửi mã đó vào cuộc trò chuyện riêng với Bot, rồi xác nhận liên kết tại đây.</p>{linkCode && <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"><p className="mono-label text-[var(--ink-muted)]">Gửi nguyên mã này cho Bot</p><code className="mt-2 block break-all text-sm font-semibold">{linkCode}</code><button type="button" disabled={linking} onClick={onConfirmTelegramLink} className="swiss-button mt-4 disabled:opacity-60">Xác nhận liên kết</button></div>}<button type="button" disabled={linking} onClick={onBeginTelegramLink} className="swiss-button mt-4 disabled:opacity-60">{linking && <Loader2 className="h-4 w-4 animate-spin" />}{linkCode ? "Tạo mã mới" : "Liên kết Telegram"}</button></div>}</section><section className="mt-8 border-t border-[var(--line)] pt-6"><div className="flex items-end justify-between"><div><p className="mono-label text-[var(--ink-muted)]">Lịch sử nhắc Telegram</p><h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Telegram</h4></div><span className="mono-label text-neutral-400">{telegramHistory.length}</span></div>{telegramHistory.length ? <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{telegramHistory.map(log => <div key={log.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">{log.eventTitle}</p><p className="mono-label mt-1 text-[var(--ink-muted)]">{formatDate(log.sentAt, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>{log.status === "error" && <p className="mt-2 text-xs text-[var(--terracotta)]">{log.errorMessage || "Lỗi không xác định"}</p>}</div><span className={`h-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${log.status === "success" ? "bg-[var(--sage-soft)] text-[var(--sage)]" : "bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)]"}`}>{log.status === "success" ? "Đã gửi" : "Không thể gửi"}</span></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--ink-muted)]">Chưa có lần gửi nào.</p>}</section></div></section></div>;
}

function TaskDialog({ open, onOpenChange, task, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; task: TaskRecord | null; saving: boolean; onSave: (data: { title: string; description: string | null; status: TaskStatus; priority: Priority; dueAt: Date | null; reminderAt: Date | null }) => void }) { const [form, setForm] = useState({ title: "", description: "", status: "todo" as TaskStatus, priority: "medium" as Priority, dueAt: "", reminderAt: "" }); useEffect(() => { if (open) setForm({ title: task?.title ?? "", description: task?.description ?? "", status: task?.status ?? "todo", priority: task?.priority ?? "medium", dueAt: toDateTimeInput(task?.dueAt), reminderAt: toDateTimeInput(task?.reminderAt) }); }, [open, task]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-0"><form onSubmit={event => { event.preventDefault(); onSave({ title: form.title, description: form.description || null, status: form.status, priority: form.priority, dueAt: form.dueAt ? new Date(form.dueAt) : null, reminderAt: form.reminderAt ? new Date(form.reminderAt) : null }); }}><DialogHeader className="border-b border-[var(--line)] bg-[var(--surface-soft)] p-5"><p className="mono-label text-[var(--terracotta)]">Công việc / {task ? "Chỉnh sửa" : "Tạo mới"}</p><DialogTitle className="font-display text-3xl tracking-[-0.035em]">{task ? "Cập nhật công việc" : "Công việc mới"}</DialogTitle></DialogHeader><div className="space-y-5 p-5"><label className="block"><span className="mono-label mb-2 block">Tên công việc *</span><input className="swiss-input" autoFocus value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Hoàn thành kế hoạch tuần" required maxLength={240} /></label><label className="block"><span className="mono-label mb-2 block">Ghi chú</span><textarea className="swiss-input min-h-20 resize-y" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Thêm bối cảnh nếu cần" maxLength={2000} /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Trạng thái</span><select className="swiss-input" value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as TaskStatus }))}><option value="todo">Chưa làm</option><option value="in_progress">Đang làm</option><option value="done">Hoàn thành</option></select></label><label><span className="mono-label mb-2 block">Ưu tiên</span><select className="swiss-input" value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value as Priority }))}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></label></div><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Thời hạn</span><input type="datetime-local" className="swiss-input" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))} /></label><label><span className="mono-label mb-2 block">Nhắc vào lúc</span><input type="datetime-local" className="swiss-input" value={form.reminderAt} onChange={event => setForm(current => ({ ...current, reminderAt: event.target.value }))} /></label></div></div><DialogFooter className="border-t border-[var(--line)] bg-[var(--surface-soft)] p-5"><button type="button" onClick={() => onOpenChange(false)} className="swiss-button ghost">Hủy</button><button disabled={saving} className="swiss-button disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{task ? "Lưu thay đổi" : "Tạo công việc"}</button></DialogFooter></form></DialogContent></Dialog>; }

function EventDialog({ open, onOpenChange, event, prefill, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; event: EventRecord | null; prefill: EventPrefill | null; saving: boolean; onSave: (data: { title: string; description: string | null; startAt: Date; endAt: Date; reminderAt: Date | null; recurrenceRule: RecurrenceInput | null; telegramReminder: boolean }) => void }) {
  const [form, setForm] = useState({ title: "", description: "", startAt: "", endAt: "", reminderAt: "", telegramReminder: false, recurrenceFreq: "none" as "none" | RecurrenceInput["freq"], interval: "1", daysOfWeek: [] as number[], endType: "never" as "never" | "date" | "count", endDate: "", count: "" });
  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const start = event?.startAt ?? prefill?.startAt ?? now;
    const rule = parseRecurrenceInput(event?.recurrenceRule);
    setForm({ title: event?.title ?? prefill?.title ?? "", description: event?.description ?? prefill?.description ?? "", startAt: toDateTimeInput(start), endAt: toDateTimeInput(event?.endAt ?? prefill?.endAt ?? new Date(now.getTime() + 3600000)), reminderAt: toDateTimeInput(event?.reminderAt ?? prefill?.reminderAt), telegramReminder: event?.telegramReminder ?? false, recurrenceFreq: rule?.freq ?? "none", interval: String(rule?.interval ?? 1), daysOfWeek: rule?.daysOfWeek ?? [], endType: rule?.endDate ? "date" : rule?.count ? "count" : "never", endDate: rule?.endDate ?? "", count: rule?.count ? String(rule.count) : "" });
  }, [open, event, prefill]);
  const setQuickReminder = (minutes: number) => {
    if (!form.startAt) return toast.info("Hãy chọn thời điểm bắt đầu trước khi đặt nhắc nhanh");
    setForm(current => ({ ...current, reminderAt: toDateTimeInput(quickReminderAt(current.startAt, minutes)) }));
  };
  const toggleDay = (day: number) => setForm(current => ({ ...current, daysOfWeek: current.daysOfWeek.includes(day) ? current.daysOfWeek.filter(item => item !== day) : [...current.daysOfWeek, day].sort((a, b) => a - b) }));
  const setRecurrence = (freq: "none" | RecurrenceInput["freq"]) => setForm(current => ({ ...current, recurrenceFreq: freq, daysOfWeek: freq === "weekly" && !current.daysOfWeek.length ? [weekdayFromDateTime(current.startAt)] : current.daysOfWeek }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-0"><form onSubmit={submit => { submit.preventDefault(); if (new Date(form.endAt) <= new Date(form.startAt)) return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu"); if (form.telegramReminder && !form.reminderAt) return toast.error("Hãy chọn thời điểm nhắc để gửi Telegram"); const interval = Number(form.interval); if (form.recurrenceFreq !== "none" && (!Number.isInteger(interval) || interval < 1 || interval > 365)) return toast.error("Hãy nhập số lần lặp hợp lệ"); if (form.recurrenceFreq === "weekly" && !form.daysOfWeek.length) return toast.error("Hãy chọn ít nhất một ngày trong tuần"); if (form.endType === "date" && !form.endDate) return toast.error("Hãy chọn ngày kết thúc"); const count = Number(form.count); if (form.endType === "count" && (!Number.isInteger(count) || count < 1 || count > 500)) return toast.error("Hãy nhập số lần lặp hợp lệ"); const recurrenceRule: RecurrenceInput | null = form.recurrenceFreq === "none" ? null : { freq: form.recurrenceFreq, interval, ...(form.recurrenceFreq === "weekly" ? { daysOfWeek: form.daysOfWeek } : {}), ...(form.endType === "date" ? { endDate: form.endDate } : {}), ...(form.endType === "count" ? { count } : {}) }; onSave({ title: form.title, description: form.description || null, startAt: new Date(form.startAt), endAt: new Date(form.endAt), reminderAt: form.reminderAt ? new Date(form.reminderAt) : null, recurrenceRule, telegramReminder: form.telegramReminder }); }}><DialogHeader className="border-b border-[var(--line)] bg-[var(--surface-soft)] p-5"><p className="mono-label text-[var(--terracotta)]">Lịch hẹn / {event ? "Chỉnh sửa" : "Tạo mới"}</p><DialogTitle className="font-display text-3xl tracking-[-0.035em]">{event ? "Cập nhật lịch hẹn" : "Lịch hẹn mới"}</DialogTitle></DialogHeader><div className="space-y-5 p-5"><label className="block"><span className="mono-label mb-2 block">Tiêu đề *</span><input className="swiss-input" autoFocus value={form.title} onChange={change => setForm(current => ({ ...current, title: change.target.value }))} placeholder="Ví dụ: Họp với đội dự án" required maxLength={240} /></label><label className="block"><span className="mono-label mb-2 block">Mô tả</span><textarea className="swiss-input min-h-20 resize-y" value={form.description} onChange={change => setForm(current => ({ ...current, description: change.target.value }))} placeholder="Chi tiết lịch hẹn" maxLength={2000} /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Bắt đầu *</span><input type="datetime-local" className="swiss-input" value={form.startAt} onChange={change => setForm(current => ({ ...current, startAt: change.target.value }))} required /></label><label><span className="mono-label mb-2 block">Kết thúc *</span><input type="datetime-local" className="swiss-input" value={form.endAt} onChange={change => setForm(current => ({ ...current, endAt: change.target.value }))} required /></label></div><section className="border border-black p-4"><div className="flex items-center justify-between gap-4"><span className="mono-label">Nhắc vào lúc</span><div className="flex border border-black"><button type="button" onClick={() => setQuickReminder(30)} className="border-r border-black px-2 py-1 text-[10px] font-bold hover:bg-black hover:text-white">−30m</button><button type="button" onClick={() => setQuickReminder(15)} className="border-r border-black px-2 py-1 text-[10px] font-bold hover:bg-black hover:text-white">−15m</button><button type="button" onClick={() => setQuickReminder(5)} className="px-2 py-1 text-[10px] font-bold hover:bg-black hover:text-white">−5m</button></div></div><input type="datetime-local" className="swiss-input mt-3" value={form.reminderAt} onChange={change => setForm(current => ({ ...current, reminderAt: change.target.value }))} /><p className="mono-label mt-2 text-neutral-500">Nhắc nhanh</p></section><section className="border border-black p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><span className="mono-label">Lặp lại</span><div className="flex flex-wrap border border-black">{(["none", "daily", "weekly", "monthly"] as const).map(freq => <button key={freq} type="button" onClick={() => setRecurrence(freq)} className={`border-r border-black px-3 py-2 text-[10px] font-bold last:border-r-0 ${form.recurrenceFreq === freq ? "bg-black text-white" : "bg-white hover:bg-[#f1f1ed]"}`}>{freq === "none" ? "Không lặp" : freq === "daily" ? "Hàng ngày" : freq === "weekly" ? "Hàng tuần" : "Hàng tháng"}</button>)}</div></div>{form.recurrenceFreq !== "none" && <div className="mt-4 space-y-4 border-t border-black pt-4"><label className="block max-w-48"><span className="mono-label mb-2 block">Khoảng lặp</span><input type="number" min={1} max={365} className="swiss-input" value={form.interval} onChange={change => setForm(current => ({ ...current, interval: change.target.value }))} /></label>{form.recurrenceFreq === "weekly" && <div><span className="mono-label mb-2 block">Ngày trong tuần</span><div className="flex flex-wrap gap-2">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, index) => <button key={day} type="button" onClick={() => toggleDay(index + 1)} className={`h-9 min-w-9 border border-black px-2 text-[10px] font-bold ${form.daysOfWeek.includes(index + 1) ? "bg-[#e23221] text-white" : "bg-white hover:bg-[#f1f1ed]"}`}>{day}</button>)}</div></div>}<div><span className="mono-label mb-2 block">Giới hạn</span><div className="flex flex-wrap border border-black">{(["never", "date", "count"] as const).map(type => <button key={type} type="button" onClick={() => setForm(current => ({ ...current, endType: type }))} className={`border-r border-black px-3 py-2 text-[10px] font-bold last:border-r-0 ${form.endType === type ? "bg-black text-white" : "bg-white hover:bg-[#f1f1ed]"}`}>{type === "never" ? "Không giới hạn" : type === "date" ? "Đến ngày" : "Sau số lần"}</button>)}</div></div>{form.endType === "date" && <label className="block max-w-56"><span className="mono-label mb-2 block">Đến ngày</span><input type="date" className="swiss-input" value={form.endDate} onChange={change => setForm(current => ({ ...current, endDate: change.target.value }))} /></label>}{form.endType === "count" && <label className="block max-w-48"><span className="mono-label mb-2 block">Số lần lặp</span><input type="number" min={1} max={500} className="swiss-input" value={form.count} onChange={change => setForm(current => ({ ...current, count: change.target.value }))} /></label>}</div>}</section><label className="flex cursor-pointer items-start gap-3 border border-black p-4"><input type="checkbox" checked={form.telegramReminder} onChange={change => setForm(current => ({ ...current, telegramReminder: change.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#e23221]" /><span><span className="block text-sm font-bold">Gửi nhắc qua Telegram</span><span className="mt-1 block text-xs leading-5 text-neutral-500">Yêu cầu Telegram đã được liên kết và ứng dụng đã xuất bản.</span></span></label></div><DialogFooter className="border-t border-[var(--line)] bg-[var(--surface-soft)] p-5"><button type="button" onClick={() => onOpenChange(false)} className="swiss-button ghost">Hủy</button><button disabled={saving} className="swiss-button disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{event ? "Lưu thay đổi" : "Tạo lịch hẹn"}</button></DialogFooter></form></DialogContent></Dialog>;
}
