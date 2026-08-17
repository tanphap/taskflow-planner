import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
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
  Clock3,
  Edit3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
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

type View = "dashboard" | "tasks" | "calendar" | "notifications" | "profile";
type TaskStatus = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high";

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
};

type NotificationRecord = {
  id: number;
  kind: "task" | "event";
  title: string;
  body: string | null;
  scheduledFor: Date;
};

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

function formatDate(value: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = asDate(value);
  if (!date) return "Chưa có thời hạn";
  return new Intl.DateTimeFormat("vi-VN", options ?? { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function pageTitle(view: View) {
  return ({
    dashboard: "Tổng quan hôm nay",
    tasks: "Công việc",
    calendar: "Lịch hẹn",
    notifications: "Trung tâm nhắc việc",
    profile: "Hồ sơ cá nhân",
  })[view];
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
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
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: async () => { await invalidateWorkspace(); setEventDialogOpen(false); toast.success("Đã tạo lịch hẹn"); },
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

  const openCreateTask = () => { setEditingTask(null); setTaskDialogOpen(true); };
  const openCreateEvent = () => { setEditingEvent(null); setEventDialogOpen(true); };
  const openEditTask = (task: TaskRecord) => { setEditingTask(task); setTaskDialogOpen(true); };
  const openEditEvent = (event: EventRecord) => { setEditingEvent(event); setEventDialogOpen(true); };

  if (loading) {
    return <div className="min-h-screen swiss-grid grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!user) {
    return <LoginLanding />;
  }

  const taskData = (taskQuery.data ?? []) as TaskRecord[];
  const eventData = (eventQuery.data ?? []) as EventRecord[];
  const notificationData = (notifications.data ?? []) as NotificationRecord[];

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-[#161616]">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-50 w-[274px] border-r border-black bg-[#f4f4f0] transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-20 items-center justify-between border-b border-black px-5">
            <button onClick={() => setView("dashboard")} className="flex items-center gap-3 text-left">
              <span className="red-block grid h-8 w-8 place-items-center text-lg font-bold text-white">T</span>
              <span className="leading-none"><span className="block text-lg font-bold tracking-[-0.06em]">TASKFLOW</span><span className="mono-label text-neutral-500">Personal planner</span></span>
            </button>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X className="h-5 w-5" /></button>
          </div>
          <nav className="p-3 pt-5" aria-label="Điều hướng chính">
            <p className="mono-label mb-3 px-3 text-neutral-500">Bảng điều khiển</p>
            {navigation.map(item => {
              const Icon = item.icon;
              const count = item.id === "notifications" ? notificationData.length : undefined;
              return <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} className={`nav-item ${view === item.id ? "active" : ""}`}>
                <Icon className="h-4 w-4" /> <span className="flex-1">{item.label}</span>{count ? <span className="grid h-5 min-w-5 place-items-center bg-[#e23221] px-1 text-[10px] font-bold text-white">{count}</span> : null}
              </button>;
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t border-black p-3">
            <button onClick={() => setView("profile")} className="flex w-full items-center gap-3 p-2 text-left hover:bg-white">
              <span className="grid h-8 w-8 place-items-center bg-black text-sm font-bold text-white">{user.name?.[0]?.toUpperCase() ?? "U"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{user.name || "Tài khoản của bạn"}</span><span className="block truncate text-[11px] text-neutral-500">{user.email || "Chưa có email"}</span></span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </aside>
        {sidebarOpen && <button onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/25 lg:hidden" aria-label="Đóng lớp phủ" />}

        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between border-b border-black bg-white px-5 md:px-8">
            <div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></button><div><p className="mono-label text-neutral-500">Không gian cá nhân / 2026</p><h1 className="text-xl font-bold tracking-[-0.05em] md:text-2xl">{pageTitle(view)}</h1></div></div>
            <div className="flex items-center gap-3"><p className="hidden text-xs font-medium text-neutral-500 sm:block">{formatDate(new Date(), { weekday: "long", day: "2-digit", month: "long" })}</p><button onClick={view === "calendar" ? openCreateEvent : openCreateTask} className="swiss-button"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">{view === "calendar" ? "Lịch hẹn" : "Công việc"}</span></button></div>
          </header>

          <div className="p-5 md:p-8">
            {view === "dashboard" && <DashboardView data={dashboard.data} loading={dashboard.isLoading} onOpenTasks={() => setView("tasks")} onOpenCalendar={() => setView("calendar")} onCreateTask={openCreateTask} onEditTask={openEditTask} />}
            {view === "tasks" && <TasksView tasks={taskData} onCreate={openCreateTask} onEdit={openEditTask} onDelete={id => deleteTask.mutate({ id })} onToggleDone={task => updateTask.mutate({ id: task.id, data: { title: task.title, description: task.description, status: task.status === "done" ? "todo" : "done", priority: task.priority, dueAt: asDate(task.dueAt), reminderAt: asDate(task.reminderAt) } })} />}
            {view === "calendar" && <CalendarView events={eventData} tasks={taskData} onCreate={openCreateEvent} onEdit={openEditEvent} onDelete={id => deleteEvent.mutate({ id })} />}
            {view === "notifications" && <NotificationsView notifications={notificationData} onRead={id => markRead.mutate({ id })} onReadAll={() => markAllRead.mutate()} />}
            {view === "profile" && <ProfileView name={user.name ?? ""} email={user.email ?? ""} saving={updateProfile.isPending} onSave={data => updateProfile.mutate(data)} onLogout={logout} />}
          </div>
        </main>
      </div>

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={editingTask} saving={createTask.isPending || updateTask.isPending} onSave={data => editingTask ? updateTask.mutate({ id: editingTask.id, data }) : createTask.mutate(data)} />
      <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} event={editingEvent} saving={createEvent.isPending || updateEvent.isPending} onSave={data => editingEvent ? updateEvent.mutate({ id: editingEvent.id, data }) : createEvent.mutate(data)} />
    </div>
  );
}

function LoginLanding() {
  return <div className="min-h-screen swiss-grid p-5 md:p-10"><div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl grid-cols-1 border border-black bg-[#fbfbfa] lg:grid-cols-[1.1fr_0.9fr]"><section className="flex flex-col justify-between border-b border-black p-8 md:p-12 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><span className="red-block grid h-9 w-9 place-items-center text-xl font-bold text-white">T</span><span className="text-xl font-bold tracking-[-0.06em]">TASKFLOW</span></div><div className="py-14"><p className="mono-label mb-5">Lập kế hoạch cá nhân — 01</p><h1 className="max-w-xl text-5xl font-bold leading-[0.94] tracking-[-0.08em] md:text-7xl">Tổ chức công việc.<br /><span className="text-[#e23221]">Rõ ràng</span> từng ngày.</h1><p className="mt-8 max-w-md text-base leading-7 text-neutral-600">Không gian cá nhân cho công việc, lịch hẹn và nhắc việc — được thiết kế trên một hệ lưới trực quan và chính xác.</p></div><p className="mono-label text-neutral-400">TaskFlow / 2026</p></section><section className="flex flex-col justify-center bg-black p-8 text-white md:p-12"><div className="mb-10 h-12 w-12 border border-white/60 bg-[#e23221]" /><p className="mono-label text-white/50">Đăng nhập an toàn</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.06em]">Sẵn sàng bắt đầu?</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">Dữ liệu công việc và lịch hẹn được tách biệt theo tài khoản Manus của bạn.</p><button onClick={() => startLogin()} className="mt-10 flex w-full items-center justify-between border border-white bg-white px-4 py-4 text-left text-sm font-bold text-black transition hover:bg-[#e23221] hover:text-white"><span>Tiếp tục với Manus</span><ArrowRight className="h-5 w-5" /></button><p className="mt-5 text-[11px] leading-5 text-white/45">Bằng việc tiếp tục, bạn sử dụng luồng xác thực Manus OAuth để truy cập không gian cá nhân của mình.</p></section></div></div>;
}

function DashboardView({ data, loading, onOpenTasks, onOpenCalendar, onCreateTask, onEditTask }: { data: any; loading: boolean; onOpenTasks: () => void; onOpenCalendar: () => void; onCreateTask: () => void; onEditTask: (task: TaskRecord) => void }) {
  const stats = data?.stats ?? { total: 0, completed: 0, inProgress: 0, completionRate: 0 };
  const todayTasks = (data?.todayTasks ?? []) as TaskRecord[];
  const upcomingTasks = (data?.upcomingTasks ?? []) as TaskRecord[];
  const upcomingEvents = (data?.upcomingEvents ?? []) as EventRecord[];
  if (loading) return <div className="grid h-80 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <div className="mx-auto max-w-7xl enter-up"><section className="grid gap-0 border border-black lg:grid-cols-[1.36fr_0.64fr]"><div className="relative overflow-hidden border-b border-black p-6 md:p-8 lg:border-b-0 lg:border-r"><div className="absolute right-0 top-0 h-24 w-24 bg-[#e23221]" /><p className="mono-label text-neutral-500">Tình hình hôm nay</p><h2 className="mt-5 max-w-lg text-4xl font-bold leading-[0.94] tracking-[-0.07em] md:text-5xl">Làm việc có chủ đích, không chỉ bận rộn.</h2><div className="mt-10 flex items-end gap-5"><div><p className="text-6xl font-bold leading-none tracking-[-0.09em]">{stats.completionRate}<span className="text-3xl">%</span></p><p className="mono-label mt-3 text-neutral-500">Tỷ lệ hoàn thành</p></div><div className="mb-1 h-14 w-px bg-black" /><p className="mb-1 max-w-[150px] text-xs leading-5 text-neutral-600">{stats.completed}/{stats.total} công việc đã hoàn thành trong không gian của bạn.</p></div></div><div className="bg-black p-6 text-white md:p-8"><p className="mono-label text-white/50">Thao tác nhanh</p><button onClick={onCreateTask} className="mt-7 flex w-full items-center justify-between border border-white/40 p-4 text-left text-sm font-bold transition hover:border-[#e23221] hover:bg-[#e23221]"><span>Tạo công việc mới</span><Plus className="h-5 w-5" /></button><button onClick={onOpenCalendar} className="mt-3 flex w-full items-center justify-between border border-white/40 p-4 text-left text-sm font-bold transition hover:border-white hover:bg-white hover:text-black"><span>Xem lịch hẹn</span><CalendarDays className="h-5 w-5" /></button><div className="mt-8 border-t border-white/20 pt-4"><p className="text-3xl font-bold tracking-[-0.07em]">{stats.inProgress.toString().padStart(2, "0")}</p><p className="mono-label mt-1 text-white/50">Đang thực hiện</p></div></div></section>
  <section className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_0.9fr]"><div className="border border-black bg-white"><SectionHeader index="01" title="Việc cần làm hôm nay" action="Xem tất cả" onAction={onOpenTasks} />{todayTasks.length ? <div>{todayTasks.map(task => <TaskLine key={task.id} task={task} onEdit={() => onEditTask(task)} />)}</div> : <EmptyLine text="Không còn việc nào đến hạn hôm nay." onAction={onCreateTask} action="Tạo công việc" />}</div><div className="border border-black bg-white"><SectionHeader index="02" title="Lịch hẹn sắp tới" action="Mở lịch" onAction={onOpenCalendar} />{upcomingEvents.length ? <div>{upcomingEvents.map(event => <div key={event.id} className="flex gap-4 border-b border-black p-4 last:border-b-0"><div className="w-12 shrink-0 border-r border-black pr-3 text-center"><p className="text-xl font-bold leading-none">{new Date(event.startAt).getDate()}</p><p className="mono-label mt-1 text-neutral-500">{new Intl.DateTimeFormat("vi-VN", { month: "short" }).format(new Date(event.startAt))}</p></div><div><p className="font-bold tracking-[-0.03em]">{event.title}</p><p className="mt-1 text-xs text-neutral-500">{formatTime(event.startAt)} — {formatTime(event.endAt)}</p></div></div>)}</div> : <EmptyLine text="Chưa có lịch hẹn nào sắp diễn ra." onAction={onOpenCalendar} action="Tạo lịch hẹn" />}</div></section>
  {upcomingTasks.length > 0 && <section className="mt-7 border border-black bg-[#f1f1ed]"><SectionHeader index="03" title="Tiếp theo" /><div className="grid md:grid-cols-2 xl:grid-cols-3">{upcomingTasks.map(task => <div key={task.id} className="border-b border-black p-5 last:border-b-0 md:border-b-0 md:border-r xl:last:border-r-0"><PriorityMark priority={task.priority} /><p className="mt-7 text-lg font-bold tracking-[-0.05em]">{task.title}</p><p className="mt-2 text-xs text-neutral-500">Đến hạn: {formatDate(task.dueAt)}</p></div>)}</div></section>}</div>;
}

function SectionHeader({ index, title, action, onAction }: { index: string; title: string; action?: string; onAction?: () => void }) { return <div className="flex items-center justify-between border-b border-black px-4 py-3"><div className="flex items-center gap-3"><span className="mono-label text-[#e23221]">{index}</span><h3 className="text-sm font-bold tracking-[-0.03em]">{title}</h3></div>{action && <button onClick={onAction} className="mono-label border-b border-black pb-0.5 hover:text-[#e23221] hover:border-[#e23221]">{action}</button>}</div>; }
function EmptyLine({ text, action, onAction }: { text: string; action: string; onAction: () => void }) { return <div className="p-8"><Circle className="h-5 w-5 text-neutral-400" /><p className="mt-4 text-sm text-neutral-600">{text}</p><button onClick={onAction} className="mono-label mt-5 border-b border-black pb-0.5">{action}</button></div>; }
function PriorityMark({ priority }: { priority: Priority }) { return <span className={`inline-block h-3 w-3 ${priority === "high" ? "bg-[#e23221]" : priority === "medium" ? "bg-orange-400" : "bg-neutral-300"}`} />; }
function TaskLine({ task, onEdit }: { task: TaskRecord; onEdit: () => void }) { return <button onClick={onEdit} className="flex w-full items-center gap-3 border-b border-black p-4 text-left last:border-b-0 hover:bg-[#f1f1ed]"><PriorityMark priority={task.priority} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold tracking-[-0.03em]">{task.title}</p><p className="mt-1 text-[11px] text-neutral-500">{formatDate(task.dueAt, { weekday: "short", day: "2-digit", month: "short" })}</p></div><StatusBadge status={task.status} /></button>; }
function StatusBadge({ status }: { status: TaskStatus }) { return <span className={`shrink-0 px-2 py-1 text-[10px] font-bold ${statusMeta[status].className}`}>{statusMeta[status].label}</span>; }

function TasksView({ tasks, onCreate, onEdit, onDelete, onToggleDone }: { tasks: TaskRecord[]; onCreate: () => void; onEdit: (task: TaskRecord) => void; onDelete: (id: number) => void; onToggleDone: (task: TaskRecord) => void }) {
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const visibleTasks = tasks.filter(task => (statusFilter === "all" || task.status === statusFilter) && (priorityFilter === "all" || task.priority === priorityFilter));
  return <div className="mx-auto max-w-7xl enter-up"><section className="border border-black bg-white"><div className="grid border-b border-black lg:grid-cols-[1fr_auto]"><div className="p-5 md:p-6"><p className="mono-label text-neutral-500">Danh sách / {tasks.length.toString().padStart(2, "0")}</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.07em]">Mọi công việc, cùng một nhịp.</h2></div><div className="flex items-center gap-2 border-t border-black p-4 lg:border-l lg:border-t-0"><FilterSelect label="Trạng thái" value={statusFilter} onChange={value => setStatusFilter(value as "all" | TaskStatus)} options={[["all", "Tất cả"], ["todo", "Chưa làm"], ["in_progress", "Đang làm"], ["done", "Hoàn thành"]]} /><FilterSelect label="Ưu tiên" value={priorityFilter} onChange={value => setPriorityFilter(value as "all" | Priority)} options={[["all", "Mọi mức"], ["high", "Cao"], ["medium", "Trung bình"], ["low", "Thấp"]]} /><button onClick={onCreate} className="swiss-button"><Plus className="h-4 w-4" /></button></div></div>
  {visibleTasks.length ? <div>{visibleTasks.map(task => <div key={task.id} className="group grid items-center gap-4 border-b border-black p-4 last:border-b-0 md:grid-cols-[30px_1fr_120px_120px_115px]"><button onClick={() => onToggleDone(task)} className="grid h-6 w-6 place-items-center border border-black transition hover:bg-black hover:text-white" aria-label="Đánh dấu hoàn thành">{task.status === "done" && <Check className="h-4 w-4" />}</button><button onClick={() => onEdit(task)} className="min-w-0 text-left"><div className="flex items-center gap-2"><PriorityMark priority={task.priority} /><p className={`truncate text-sm font-bold tracking-[-0.03em] ${task.status === "done" ? "text-neutral-400 line-through" : ""}`}>{task.title}</p></div>{task.description && <p className="mt-1 truncate pl-5 text-xs text-neutral-500">{task.description}</p>}</button><div><p className="mono-label text-neutral-400 md:hidden">Hạn</p><p className="text-xs">{formatDate(task.dueAt, { day: "2-digit", month: "short" })}</p></div><div><p className="mono-label text-neutral-400 md:hidden">Trạng thái</p><StatusBadge status={task.status} /></div><div className="flex items-center justify-between gap-2"><span className={`px-2 py-1 text-[10px] font-bold ${priorityMeta[task.priority].className}`}>{priorityMeta[task.priority].label}</span><button onClick={() => onDelete(task.id)} className="p-1 text-neutral-500 opacity-100 hover:text-[#e23221] md:opacity-0 md:group-hover:opacity-100" aria-label="Xóa công việc"><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <div className="p-12 text-center"><ClipboardList className="mx-auto h-8 w-8" /><p className="mt-4 font-bold">Chưa có công việc phù hợp</p><p className="mt-1 text-sm text-neutral-500">Thử thay đổi bộ lọc hoặc thêm công việc đầu tiên của bạn.</p><button onClick={onCreate} className="swiss-button mt-6"><Plus className="h-4 w-4" /> Thêm công việc</button></div>}</section></div>;
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="relative"><span className="sr-only">{label}</span><select className="h-9 appearance-none border border-black bg-white py-0 pl-3 pr-8 text-xs font-bold outline-none focus:shadow-[3px_3px_0_#e23221]" value={value} onChange={event => onChange(event.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4" /></label>; }

function CalendarView({ events, tasks, onCreate, onEdit, onDelete }: { events: EventRecord[]; tasks: TaskRecord[]; onCreate: () => void; onEdit: (event: EventRecord) => void; onDelete: (id: number) => void }) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const calendarDays = useMemo(() => monthGrid(cursor), [cursor]);
  const selectedKey = localDayKey(selectedDay);
  const selectedEvents = events.filter(event => localDayKey(event.startAt) === selectedKey);
  const selectedTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === selectedKey);
  const heading = mode === "month" ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(cursor) : formatDate(selectedDay, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const shift = (amount: number) => { const next = new Date(mode === "month" ? cursor : selectedDay); if (mode === "month") next.setMonth(next.getMonth() + amount); else if (mode === "week") next.setDate(next.getDate() + amount * 7); else next.setDate(next.getDate() + amount); mode === "month" ? setCursor(next) : setSelectedDay(next); };
  return <div className="mx-auto max-w-7xl enter-up"><section className="border border-black bg-white"><div className="flex flex-col justify-between border-b border-black md:flex-row"><div className="flex items-center gap-3 p-5"><button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center border border-black hover:bg-black hover:text-white"><ArrowLeft className="h-4 w-4" /></button><button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center border border-black hover:bg-black hover:text-white"><ArrowRight className="h-4 w-4" /></button><div className="ml-2"><p className="mono-label text-neutral-500">Lịch cá nhân</p><h2 className="text-2xl font-bold tracking-[-0.06em] capitalize">{heading}</h2></div></div><div className="flex items-center gap-2 border-t border-black p-4 md:border-l md:border-t-0"><div className="flex border border-black">{(["month", "week", "day"] as const).map(item => <button key={item} onClick={() => setMode(item)} className={`px-3 py-2 text-[10px] font-bold uppercase ${mode === item ? "bg-black text-white" : "bg-white"}`}>{item === "month" ? "Tháng" : item === "week" ? "Tuần" : "Ngày"}</button>)}</div><button onClick={onCreate} className="swiss-button"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Tạo lịch hẹn</span></button></div></div>
  {mode === "month" ? <div className="overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-7 border-b border-black">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <div key={day} className="border-r border-black p-2 text-center last:border-r-0"><span className="mono-label text-neutral-500">{day}</span></div>)}</div><div className="grid grid-cols-7">{calendarDays.map(day => { const key = localDayKey(day); const dayEvents = events.filter(event => localDayKey(event.startAt) === key); const dayTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === key); const isCurrent = day.getMonth() === cursor.getMonth(); const isToday = key === localDayKey(new Date()); return <button key={key} onClick={() => { setSelectedDay(day); setMode("day"); }} className={`min-h-28 border-b border-r border-black p-2 text-left last:border-r-0 hover:bg-[#f1f1ed] ${isCurrent ? "" : "bg-[#f5f5f2] text-neutral-400"}`}><span className={`grid h-6 w-6 place-items-center text-xs font-bold ${isToday ? "bg-[#e23221] text-white" : ""}`}>{day.getDate()}</span><div className="mt-2 space-y-1">{dayEvents.slice(0, 2).map(event => <span key={event.id} className="block truncate bg-black px-1.5 py-1 text-[10px] font-bold text-white">{event.title}</span>)}{dayTasks.slice(0, 1).map(task => <span key={task.id} className="block truncate border-l-[3px] border-[#e23221] bg-neutral-100 px-1.5 py-1 text-[10px] font-bold text-black">{task.title}</span>)}{dayEvents.length + dayTasks.length > 3 && <span className="mono-label text-neutral-500">+ {dayEvents.length + dayTasks.length - 3}</span>}</div></button>; })}</div></div></div> : mode === "week" ? <WeekAgenda anchor={selectedDay} events={events} tasks={tasks} onSelectDay={day => { setSelectedDay(day); setMode("day"); }} onEdit={onEdit} /> : <DayAgenda day={selectedDay} events={selectedEvents} tasks={selectedTasks} onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} />}</section></div>;
}
function monthGrid(cursor: Date) { const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1); return Array.from({ length: 42 }, (_, index) => { const value = new Date(start); value.setDate(start.getDate() + index); return value; }); }
function weekDays(anchor: Date) { const start = new Date(anchor); const day = start.getDay() || 7; start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - day + 1); return Array.from({ length: 7 }, (_, index) => { const value = new Date(start); value.setDate(start.getDate() + index); return value; }); }
function WeekAgenda({ anchor, events, tasks, onSelectDay, onEdit }: { anchor: Date; events: EventRecord[]; tasks: TaskRecord[]; onSelectDay: (day: Date) => void; onEdit: (event: EventRecord) => void }) { const days = weekDays(anchor); const todayKey = localDayKey(new Date()); return <div className="overflow-x-auto"><div className="grid min-h-[480px] min-w-[840px] grid-cols-7">{days.map(day => { const key = localDayKey(day); const dayEvents = events.filter(event => localDayKey(event.startAt) === key); const dayTasks = tasks.filter(task => task.dueAt && localDayKey(task.dueAt) === key); const isToday = key === todayKey; return <div key={key} className="border-r border-black last:border-r-0"><button onClick={() => onSelectDay(day)} className="flex w-full items-end justify-between border-b border-black p-3 text-left hover:bg-[#f1f1ed]"><span className="mono-label text-neutral-500">{new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(day)}</span><span className={`grid h-7 w-7 place-items-center text-sm font-bold ${isToday ? "bg-[#e23221] text-white" : ""}`}>{day.getDate()}</span></button><div className="min-h-[410px] space-y-2 p-2">{dayEvents.map(event => <button key={event.id} onClick={() => onEdit(event)} className="block w-full border border-black bg-black p-2 text-left text-white hover:bg-[#e23221]"><p className="text-[10px] font-bold">{formatTime(event.startAt)}</p><p className="mt-1 line-clamp-2 text-xs font-bold">{event.title}</p></button>)}{dayTasks.map(task => <button key={task.id} onClick={() => onSelectDay(day)} className="block w-full border-l-[3px] border-[#e23221] bg-[#f1f1ed] p-2 text-left hover:bg-white"><p className="line-clamp-2 text-xs font-bold">{task.title}</p><p className="mono-label mt-2 text-neutral-500">Hạn công việc</p></button>)}{!dayEvents.length && !dayTasks.length && <p className="mono-label px-1 pt-2 text-neutral-300">Trống</p>}</div></div>; })}</div></div>; }
function DayAgenda({ day, events, tasks, onCreate, onEdit, onDelete }: { day: Date; events: EventRecord[]; tasks: TaskRecord[]; onCreate: () => void; onEdit: (event: EventRecord) => void; onDelete: (id: number) => void }) { return <div className="grid min-h-[520px] md:grid-cols-[150px_1fr]"><div className="border-b border-black bg-[#f1f1ed] p-5 md:border-b-0 md:border-r"><p className="mono-label text-neutral-500">Ngày đã chọn</p><p className="mt-3 text-5xl font-bold tracking-[-0.08em]">{day.getDate()}</p><p className="mt-1 text-sm font-bold capitalize">{new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(day)}</p><div className="mt-10 space-y-3"><p className="mono-label text-neutral-500">{events.length} sự kiện</p><p className="mono-label text-neutral-500">{tasks.length} công việc</p></div></div><div>{events.length || tasks.length ? <div>{events.map(event => <div key={event.id} className="group grid gap-4 border-b border-black p-5 md:grid-cols-[104px_1fr_auto]"><div className="text-sm font-bold">{formatTime(event.startAt)}<span className="text-neutral-400"> — {formatTime(event.endAt)}</span></div><button onClick={() => onEdit(event)} className="text-left"><p className="font-bold tracking-[-0.04em]">{event.title}</p>{event.description && <p className="mt-1 text-xs text-neutral-500">{event.description}</p>}</button><button onClick={() => onDelete(event.id)} className="self-start p-1 text-neutral-500 opacity-100 hover:text-[#e23221] md:opacity-0 md:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div>)}{tasks.map(task => <div key={task.id} className="flex items-center gap-4 border-b border-black bg-[#f8f8f6] p-5"><PriorityMark priority={task.priority} /><div><p className="text-sm font-bold">{task.title}</p><p className="mt-1 text-[11px] text-neutral-500">Công việc đến hạn</p></div></div>)}</div> : <EmptyLine text="Ngày này chưa có lịch hẹn hay công việc đến hạn." action="Tạo lịch hẹn" onAction={onCreate} />}</div></div>; }

function NotificationsView({ notifications, onRead, onReadAll }: { notifications: NotificationRecord[]; onRead: (id: number) => void; onReadAll: () => void }) { return <div className="mx-auto max-w-4xl enter-up"><section className="border border-black bg-white"><div className="flex items-center justify-between border-b border-black p-5"><div><p className="mono-label text-neutral-500">Nhắc việc trong ứng dụng</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.06em]">Có {notifications.length} điều cần chú ý</h2></div>{notifications.length > 0 && <button onClick={onReadAll} className="mono-label border-b border-black pb-0.5">Đánh dấu đã đọc</button>}</div>{notifications.length ? <div>{notifications.map(item => <div key={item.id} className="group flex gap-4 border-b border-black p-5 last:border-b-0"><div className="red-block mt-1 grid h-8 w-8 shrink-0 place-items-center text-white"><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="font-bold tracking-[-0.03em]">{item.title}</p><p className="mt-1 text-sm text-neutral-600">{item.body}</p><p className="mono-label mt-3 text-neutral-400">{formatDate(item.scheduledFor, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</p></div><button onClick={() => onRead(item.id)} className="grid h-8 w-8 place-items-center border border-black hover:bg-black hover:text-white" aria-label="Đánh dấu đã đọc"><Check className="h-4 w-4" /></button></div>)}</div> : <div className="p-12 text-center"><AlarmClock className="mx-auto h-9 w-9" /><p className="mt-4 font-bold">Mọi thứ đều đúng nhịp</p><p className="mt-1 text-sm text-neutral-500">Nhắc việc sẽ xuất hiện tại đây khi bạn đến thời điểm đã đặt.</p></div>}</section><p className="mt-4 text-xs leading-5 text-neutral-500">Nhắc việc được đồng bộ khi ứng dụng đang mở và cũng xuất hiện ngay khi bạn quay lại không gian làm việc.</p></div>; }

function ProfileView({ name, email, saving, onSave, onLogout }: { name: string; email: string; saving: boolean; onSave: (data: { name: string; email: string }) => void; onLogout: () => void }) { const [form, setForm] = useState({ name, email }); useEffect(() => setForm({ name, email }), [name, email]); return <div className="mx-auto max-w-4xl enter-up"><section className="grid border border-black bg-white md:grid-cols-[0.65fr_1fr]"><div className="border-b border-black bg-black p-7 text-white md:border-b-0 md:border-r"><div className="red-block grid h-14 w-14 place-items-center text-2xl font-bold">{form.name?.[0]?.toUpperCase() || "U"}</div><p className="mono-label mt-12 text-white/45">Tài khoản Manus</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.07em]">Không gian của riêng bạn.</h2><p className="mt-5 text-sm leading-6 text-white/65">Thông tin này thuộc tài khoản hiện tại. Công việc, lịch hẹn và nhắc việc luôn được phân tách theo từng người đăng nhập.</p><button onClick={onLogout} className="mt-10 flex items-center gap-2 text-xs font-bold text-white/70 hover:text-[#e23221]"><LogOut className="h-4 w-4" /> Đăng xuất</button></div><form onSubmit={event => { event.preventDefault(); onSave(form); }} className="p-7"><p className="mono-label text-neutral-500">Thông tin hiển thị</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.06em]">Hồ sơ cá nhân</h3><label className="mt-8 block"><span className="mono-label mb-2 block">Tên hiển thị</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="swiss-input" placeholder="Tên của bạn" maxLength={120} /></label><label className="mt-5 block"><span className="mono-label mb-2 block">Địa chỉ email</span><input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className="swiss-input" placeholder="you@example.com" required maxLength={320} /></label><button disabled={saving} className="swiss-button mt-8 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu thay đổi</button></form></section></div>; }

function TaskDialog({ open, onOpenChange, task, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; task: TaskRecord | null; saving: boolean; onSave: (data: { title: string; description: string | null; status: TaskStatus; priority: Priority; dueAt: Date | null; reminderAt: Date | null }) => void }) { const [form, setForm] = useState({ title: "", description: "", status: "todo" as TaskStatus, priority: "medium" as Priority, dueAt: "", reminderAt: "" }); useEffect(() => { if (open) setForm({ title: task?.title ?? "", description: task?.description ?? "", status: task?.status ?? "todo", priority: task?.priority ?? "medium", dueAt: toDateTimeInput(task?.dueAt), reminderAt: toDateTimeInput(task?.reminderAt) }); }, [open, task]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl rounded-none border-2 border-black bg-[#fbfbfa] p-0"><form onSubmit={event => { event.preventDefault(); onSave({ title: form.title, description: form.description || null, status: form.status, priority: form.priority, dueAt: form.dueAt ? new Date(form.dueAt) : null, reminderAt: form.reminderAt ? new Date(form.reminderAt) : null }); }}><DialogHeader className="border-b border-black p-5"><p className="mono-label text-[#e23221]">Công việc / {task ? "Chỉnh sửa" : "Tạo mới"}</p><DialogTitle className="text-2xl font-bold tracking-[-0.06em]">{task ? "Cập nhật công việc" : "Công việc mới"}</DialogTitle></DialogHeader><div className="space-y-5 p-5"><label className="block"><span className="mono-label mb-2 block">Tên công việc *</span><input className="swiss-input" autoFocus value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Hoàn thành kế hoạch tuần" required maxLength={240} /></label><label className="block"><span className="mono-label mb-2 block">Ghi chú</span><textarea className="swiss-input min-h-20 resize-y" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Thêm bối cảnh nếu cần" maxLength={2000} /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Trạng thái</span><select className="swiss-input" value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as TaskStatus }))}><option value="todo">Chưa làm</option><option value="in_progress">Đang làm</option><option value="done">Hoàn thành</option></select></label><label><span className="mono-label mb-2 block">Ưu tiên</span><select className="swiss-input" value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value as Priority }))}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></label></div><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Thời hạn</span><input type="datetime-local" className="swiss-input" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt: event.target.value }))} /></label><label><span className="mono-label mb-2 block">Nhắc vào lúc</span><input type="datetime-local" className="swiss-input" value={form.reminderAt} onChange={event => setForm(current => ({ ...current, reminderAt: event.target.value }))} /></label></div></div><DialogFooter className="border-t border-black p-5"><button type="button" onClick={() => onOpenChange(false)} className="swiss-button ghost">Hủy</button><button disabled={saving} className="swiss-button disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{task ? "Lưu thay đổi" : "Tạo công việc"}</button></DialogFooter></form></DialogContent></Dialog>; }

function EventDialog({ open, onOpenChange, event, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; event: EventRecord | null; saving: boolean; onSave: (data: { title: string; description: string | null; startAt: Date; endAt: Date; reminderAt: Date | null }) => void }) { const now = new Date(); const [form, setForm] = useState({ title: "", description: "", startAt: "", endAt: "", reminderAt: "" }); useEffect(() => { if (open) { const start = event?.startAt ?? now; const end = event?.endAt ?? new Date(now.getTime() + 3600000); setForm({ title: event?.title ?? "", description: event?.description ?? "", startAt: toDateTimeInput(start), endAt: toDateTimeInput(end), reminderAt: toDateTimeInput(event?.reminderAt) }); } }, [open, event]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl rounded-none border-2 border-black bg-[#fbfbfa] p-0"><form onSubmit={submit => { submit.preventDefault(); if (new Date(form.endAt) <= new Date(form.startAt)) return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu"); onSave({ title: form.title, description: form.description || null, startAt: new Date(form.startAt), endAt: new Date(form.endAt), reminderAt: form.reminderAt ? new Date(form.reminderAt) : null }); }}><DialogHeader className="border-b border-black p-5"><p className="mono-label text-[#e23221]">Lịch hẹn / {event ? "Chỉnh sửa" : "Tạo mới"}</p><DialogTitle className="text-2xl font-bold tracking-[-0.06em]">{event ? "Cập nhật lịch hẹn" : "Lịch hẹn mới"}</DialogTitle></DialogHeader><div className="space-y-5 p-5"><label className="block"><span className="mono-label mb-2 block">Tiêu đề *</span><input className="swiss-input" autoFocus value={form.title} onChange={change => setForm(current => ({ ...current, title: change.target.value }))} placeholder="Ví dụ: Họp với đội dự án" required maxLength={240} /></label><label className="block"><span className="mono-label mb-2 block">Mô tả</span><textarea className="swiss-input min-h-20 resize-y" value={form.description} onChange={change => setForm(current => ({ ...current, description: change.target.value }))} placeholder="Chi tiết lịch hẹn" maxLength={2000} /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mono-label mb-2 block">Bắt đầu *</span><input type="datetime-local" className="swiss-input" value={form.startAt} onChange={change => setForm(current => ({ ...current, startAt: change.target.value }))} required /></label><label><span className="mono-label mb-2 block">Kết thúc *</span><input type="datetime-local" className="swiss-input" value={form.endAt} onChange={change => setForm(current => ({ ...current, endAt: change.target.value }))} required /></label></div><label className="block"><span className="mono-label mb-2 block">Nhắc vào lúc</span><input type="datetime-local" className="swiss-input" value={form.reminderAt} onChange={change => setForm(current => ({ ...current, reminderAt: change.target.value }))} /></label></div><DialogFooter className="border-t border-black p-5"><button type="button" onClick={() => onOpenChange(false)} className="swiss-button ghost">Hủy</button><button disabled={saving} className="swiss-button disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{event ? "Lưu thay đổi" : "Tạo lịch hẹn"}</button></DialogFooter></form></DialogContent></Dialog>; }
