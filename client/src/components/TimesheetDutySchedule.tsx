import { CalendarDays, ChevronLeft, ChevronRight, Filter, Loader2, Pencil, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { listDutySchedulePeople, matchesDutyScheduleFilters } from "@shared/dutyScheduleFilters";

type Shift = "S" | "D";
type DutyEntry = { id: number; dutyDate: string; shift: Shift; assignment: string; sourceTitle: string };
type Draft = { id?: number; date: string; shift: Shift; assignment: string };

const daysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const daysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function TimesheetDutySchedule() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const initial = new Date();
  const [cursor, setCursor] = useState(() => ({ year: initial.getFullYear(), month: initial.getMonth() + 1 }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [personFilter, setPersonFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"all" | Shift>("all");
  const access = trpc.timesheet.access.useQuery(undefined, { refetchOnWindowFocus: false });
  const entries = trpc.timesheet.dutySchedule.useQuery(cursor, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const refresh = () => utils.timesheet.dutySchedule.invalidate(cursor);
  const createEntry = trpc.timesheet.createDutyScheduleEntry.useMutation({ onSuccess: () => { void refresh(); setDraft(null); toast.success(isEnglish ? "Duty shift added" : "Đã thêm ca trực"); }, onError: error => toast.error(error.message) });
  const updateEntry = trpc.timesheet.updateDutyScheduleEntry.useMutation({ onSuccess: () => { void refresh(); setDraft(null); toast.success(isEnglish ? "Duty shift updated" : "Đã cập nhật ca trực"); }, onError: error => toast.error(error.message) });
  const deleteEntry = trpc.timesheet.deleteDutyScheduleEntry.useMutation({ onSuccess: () => { void refresh(); setDraft(null); toast.success(isEnglish ? "Duty shift deleted" : "Đã xóa ca trực"); }, onError: error => toast.error(error.message) });
  const isSaving = createEntry.isPending || updateEntry.isPending || deleteEntry.isPending;

  const people = useMemo(() => listDutySchedulePeople((entries.data ?? []) as DutyEntry[]), [entries.data]);
  const filteredEntries = useMemo(() => ((entries.data ?? []) as DutyEntry[]).filter(entry => matchesDutyScheduleFilters(entry, personFilter, shiftFilter)), [entries.data, personFilter, shiftFilter]);
  const rowsByDate = useMemo(() => {
    const grouped = new Map<string, DutyEntry[]>();
    for (const entry of filteredEntries) {
      grouped.set(entry.dutyDate, [...(grouped.get(entry.dutyDate) ?? []), entry]);
    }
    return grouped;
  }, [filteredEntries]);
  const firstDayOffset = (new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) * 7 }, (_, index) => index - firstDayOffset + 1);
  const monthLabel = new Intl.DateTimeFormat(isEnglish ? "en-GB" : "vi-VN", { month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(Date.UTC(cursor.year, cursor.month - 1, 15, 12)));
  const previousMonth = () => setCursor(current => current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: current.month - 1 });
  const nextMonth = () => setCursor(current => current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: current.month + 1 });
  const openNew = (day: number) => setDraft({ date: dateKey(cursor.year, cursor.month, day), shift: "S", assignment: "" });
  const openEdit = (entry: DutyEntry) => setDraft({ id: entry.id, date: entry.dutyDate, shift: entry.shift, assignment: entry.assignment });
  const submitDraft = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft?.assignment.trim()) return;
    const payload = { date: draft.date, shift: draft.shift, assignment: draft.assignment.trim(), locale: language };
    if (draft.id) updateEntry.mutate({ id: draft.id, ...payload }); else createEntry.mutate(payload);
  };

  return <section className="mt-6 overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_13px_34px_rgb(75_59_45/0.055)]">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5">
      <div><p className="mono-label text-[var(--terracotta)]">{isEnglish ? "Shared roster" : "Lịch trực chung"}</p><h3 className="mt-1 flex items-center gap-2 font-display text-2xl"><CalendarDays className="h-5 w-5 text-[var(--terracotta)]" />{isEnglish ? "Duty schedule" : "Lịch trực"}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{isEnglish ? "Visible to every signed-in account. It is separate from personal appointments and has no reminders." : "Hiển thị cho mọi tài khoản đã đăng nhập. Lịch này tách biệt với lịch hẹn cá nhân và không có nhắc việc."}</p></div>
      <div className="flex items-center gap-2"><button type="button" onClick={previousMonth} className="grid h-9 w-9 place-items-center border border-[var(--line-strong)] text-[var(--ink)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]" aria-label={isEnglish ? "Previous month" : "Tháng trước"}><ChevronLeft className="h-4 w-4" /></button><p className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel}</p><button type="button" onClick={nextMonth} className="grid h-9 w-9 place-items-center border border-[var(--line-strong)] text-[var(--ink)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]" aria-label={isEnglish ? "Next month" : "Tháng sau"}><ChevronRight className="h-4 w-4" /></button></div>
    </header>
    {entries.isLoading ? <div className="grid h-56 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[var(--terracotta)]" /></div> : entries.isError ? <div className="p-6 text-sm text-[var(--terracotta-dark)]">{entries.error.message}</div> : <>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
        <div className="flex min-w-52 flex-1 items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface)] px-2.5 focus-within:border-[var(--terracotta)]"><Search className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" /><input className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-muted)]" value={personFilter} onChange={event => setPersonFilter(event.target.value)} list="timesheet-duty-people" placeholder={isEnglish ? "Find assigned person" : "Tìm người trực"} aria-label={isEnglish ? "Filter duty schedule by assigned person" : "Lọc lịch trực theo người trực"} /><datalist id="timesheet-duty-people">{people.map(person => <option key={person} value={person} />)}</datalist></div>
        <label className="flex h-10 items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface)] px-2.5 text-sm"><Filter className="h-3.5 w-3.5 text-[var(--ink-muted)]" /><span className="sr-only">{isEnglish ? "Shift" : "Loại ca"}</span><select className="bg-transparent text-sm outline-none" value={shiftFilter} onChange={event => setShiftFilter(event.target.value as "all" | Shift)} aria-label={isEnglish ? "Filter duty schedule by shift" : "Lọc lịch trực theo loại ca"}><option value="all">{isEnglish ? "All shifts" : "Tất cả ca"}</option><option value="S">{isEnglish ? "S shift" : "Ca S"}</option><option value="D">{isEnglish ? "D shift" : "Ca Đ"}</option></select></label>
        {(personFilter || shiftFilter !== "all") && <button type="button" onClick={() => { setPersonFilter(""); setShiftFilter("all"); }} className="inline-flex h-10 items-center gap-1.5 px-2 text-xs font-semibold text-[var(--terracotta-dark)] hover:bg-[var(--terracotta-soft)]" aria-label={isEnglish ? "Clear duty schedule filters" : "Xóa bộ lọc lịch trực"}><X className="h-3.5 w-3.5" />{isEnglish ? "Clear" : "Xóa lọc"}</button>}
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[var(--surface-soft)]">{(isEnglish ? daysEn : daysVi).map(day => <div key={day} className="px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-[var(--ink-muted)] sm:px-2 sm:py-2 sm:text-[10px]">{day}</div>)}</div>
      <div className="grid grid-cols-7">{cells.map((day, index) => {
        if (day < 1 || day > daysInMonth) return <div key={`blank-${index}`} className="h-14 border-b border-r border-[var(--line)] bg-[var(--surface-soft)]/45 sm:h-16" />;
        const key = dateKey(cursor.year, cursor.month, day);
        const items = rowsByDate.get(key) ?? [];
        return <div key={key} className="group h-14 overflow-y-auto border-b border-r border-[var(--line)] p-1 sm:h-16 sm:p-1.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-[var(--ink-muted)]">{day}</span>{access.data?.canManage && <button type="button" onClick={() => openNew(day)} className="grid h-4 w-4 place-items-center text-[var(--terracotta)] opacity-100 transition hover:bg-[var(--terracotta-soft)] sm:opacity-0 sm:group-hover:opacity-100" aria-label={isEnglish ? `Add duty shift on day ${day}` : `Thêm ca trực ngày ${day}`}><Plus className="h-3 w-3" /></button>}</div><div className="mt-0.5 space-y-0.5">{items.map(entry => <button type="button" key={entry.id} onClick={() => access.data?.canManage && openEdit(entry)} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] leading-3 transition ${entry.shift === "S" ? "bg-[#fff0c2] text-[#7b5000]" : "bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)]"} ${access.data?.canManage ? "hover:ring-1 hover:ring-[var(--terracotta)]" : "cursor-default"}`} title={`${entry.shift} · ${entry.assignment}`}><span className="mr-0.5 font-bold">{entry.shift}</span><span className="font-semibold">{entry.assignment}</span></button>)}</div></div>;
      })}</div>
      {!entries.data?.length && <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4 text-sm text-[var(--ink-muted)]"><UsersRound className="h-4 w-4" />{isEnglish ? "No duty shifts have been published for this month." : "Chưa có ca trực được công bố trong tháng này."}</div>}
      {!!entries.data?.length && !filteredEntries.length && <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--surface-soft)] px-5 py-3 text-sm text-[var(--ink-muted)]"><UsersRound className="h-4 w-4" />{isEnglish ? "No duty shifts match these filters." : "Không có ca trực phù hợp với bộ lọc."}</div>}
    </>}
    {draft && access.data?.canManage && <form onSubmit={submitDraft} className="border-t border-[var(--line-strong)] bg-[var(--surface-soft)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mono-label text-[var(--terracotta)]">{draft.id ? (isEnglish ? "Edit shift" : "Sửa ca trực") : (isEnglish ? "Add shift" : "Thêm ca trực")}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">{isEnglish ? "Changes are shared with every signed-in account immediately." : "Thay đổi được hiển thị ngay cho mọi tài khoản đã đăng nhập."}</p></div><button type="button" onClick={() => setDraft(null)} className="text-xs font-semibold underline-offset-4 hover:text-[var(--terracotta)] hover:underline">{isEnglish ? "Cancel" : "Hủy"}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_100px_1.5fr_auto]"><input className="swiss-input" type="date" value={draft.date} onChange={event => setDraft(current => current ? { ...current, date: event.target.value } : current)} required /><select className="swiss-input" value={draft.shift} onChange={event => setDraft(current => current ? { ...current, shift: event.target.value as Shift } : current)}><option value="S">S</option><option value="D">Đ</option></select><input className="swiss-input" value={draft.assignment} maxLength={240} onChange={event => setDraft(current => current ? { ...current, assignment: event.target.value } : current)} placeholder={isEnglish ? "Assigned person" : "Người trực"} required /><button type="submit" disabled={isSaving} className="swiss-button justify-center disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}{draft.id ? (isEnglish ? "Save" : "Lưu") : (isEnglish ? "Add" : "Thêm")}</button></div>{draft.id && <button type="button" disabled={isSaving} onClick={() => { if (window.confirm(isEnglish ? "Delete this duty shift?" : "Xóa ca trực này?")) deleteEntry.mutate({ id: draft.id! }); }} className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-[var(--terracotta-dark)] underline-offset-4 hover:underline disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{isEnglish ? "Delete shift" : "Xóa ca trực"}</button>}</form>}
  </section>;
}
