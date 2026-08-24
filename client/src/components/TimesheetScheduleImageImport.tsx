import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, CheckSquare, FileImage, Loader2, ScanLine, ShieldCheck, Square, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

type ShiftCode = "S" | "D";
type ScheduleEntry = { date: string; shift: ShiftCode; assignment: string };
type ScheduleProposal = { scheduleTitle: string; entries: ScheduleEntry[]; model: string };

const MAX_IMAGE_BYTES = 5_000_000;

function entryKey(entry: ScheduleEntry) {
  return `${entry.date}|${entry.shift}|${entry.assignment}`;
}

function formatVietnamDate(value: string, locale: "vi" | "en") {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

async function readImageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}

export function TimesheetScheduleImageImport({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const access = trpc.timesheet.access.useQuery();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const extract = trpc.timesheet.extractScheduleFromImage.useMutation({
    onSuccess: result => {
      setProposal(result);
      setSelectedKeys(new Set(result.entries.map(entryKey)));
      toast.success(isEnglish ? `${result.entries.length} duty shifts are ready for review` : `Đã đọc ${result.entries.length} ca trực để bạn rà soát`);
    },
    onError: error => toast.error(error.message),
  });
  const createEvents = trpc.timesheet.createScheduleEvents.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.calendar.list.invalidate(), utils.dashboard.overview.invalidate()]);
      toast.success(isEnglish
        ? `${result.created} duty shift(s) added${result.skipped ? `; ${result.skipped} duplicate(s) skipped` : ""}`
        : `Đã thêm ${result.created} ca trực${result.skipped ? `; bỏ qua ${result.skipped} ca trùng` : ""}`);
      setProposal(null);
      setSelectedKeys(new Set());
    },
    onError: error => toast.error(error.message),
  });

  const selectedEntries = useMemo(() => proposal?.entries.filter(entry => selectedKeys.has(entryKey(entry))) ?? [], [proposal, selectedKeys]);

  useEffect(() => () => { if (imageDataUrl?.startsWith("blob:")) URL.revokeObjectURL(imageDataUrl); }, [imageDataUrl]);

  if (!access.data?.canManage) return null;

  const clearImage = () => {
    setImageDataUrl(null);
    setImageName("");
    setAcknowledged(false);
    setProposal(null);
    setSelectedKeys(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const chooseImage = async (file?: File) => {
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) {
      toast.error(isEnglish ? "Choose a PNG, JPG, or WebP image" : "Hãy chọn ảnh PNG, JPG hoặc WebP");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(isEnglish ? "The image must be 5 MB or smaller" : "Ảnh phải có dung lượng tối đa 5 MB");
      return;
    }
    try {
      setImageDataUrl(await readImageDataUrl(file));
      setImageName(file.name.slice(0, 180));
      setAcknowledged(false);
      setProposal(null);
      setSelectedKeys(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isEnglish ? "Unable to read the image" : "Không thể đọc ảnh"));
    }
  };

  const analyzeImage = () => {
    if (!imageDataUrl) return;
    if (!acknowledged) {
      toast.error(isEnglish ? "Please confirm how the image will be processed" : "Hãy xác nhận cách ảnh được xử lý");
      return;
    }
    extract.mutate({ imageDataUrl, locale: language, acknowledgeUnpaidDataUse: true });
  };

  const toggleEntry = (entry: ScheduleEntry) => {
    const key = entryKey(entry);
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addSelectedEvents = () => {
    if (!proposal || !selectedEntries.length) return;
    const confirmation = isEnglish
      ? `Add ${selectedEntries.length} selected duty shift(s) to your personal calendar? No reminder will be enabled.`
      : `Thêm ${selectedEntries.length} ca trực đã chọn vào lịch hẹn cá nhân? Hệ thống không bật nhắc việc.`;
    if (!window.confirm(confirmation)) return;
    createEvents.mutate({ scheduleTitle: proposal.scheduleTitle, entries: selectedEntries, locale: language });
  };

  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label text-[var(--terracotta)]">Admin / Timesheet</p>
          <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{isEnglish ? "Roster image to calendar" : "Ảnh lịch trực → Lịch hẹn"}</h4>
        </div>
        <ScanLine className="mt-1 h-5 w-5 text-[var(--terracotta)]" aria-hidden="true" />
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
        {isEnglish
          ? "Upload a clear roster image. Gemini reads the Date, S, and Đ rows into reviewable all-day duty entries. Nothing is added until you select and confirm the shifts; entries are saved only in your own calendar."
          : "Tải ảnh lịch trực rõ nét. Gemini đọc các hàng Ngày, S và Đ thành ca trực cả ngày để bạn kiểm tra. Không có lịch nào được thêm cho đến khi bạn chọn và xác nhận; các ca chỉ được lưu vào lịch hẹn của chính tài khoản đang đăng nhập."}
      </p>

      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void chooseImage(event.target.files?.[0])} />
      {!imageDataUrl ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center gap-2 border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-5 text-sm font-semibold transition hover:border-[var(--terracotta)] hover:bg-[var(--terracotta-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] focus-visible:ring-offset-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--terracotta)] shadow-sm"><Upload className="h-4 w-4" /></span>
          <span>{isEnglish ? "Choose roster image" : "Chọn ảnh lịch trực"}</span>
          <span className="text-xs font-normal text-[var(--ink-muted)]">PNG, JPG, WebP · {isEnglish ? "maximum" : "tối đa"} 5 MB</span>
        </button>
      ) : (
        <div className="mt-4 overflow-hidden border border-[var(--line)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold"><FileImage className="h-4 w-4 shrink-0 text-[var(--terracotta)]" /><span className="truncate">{imageName}</span></p>
            <button type="button" onClick={clearImage} disabled={extract.isPending || createEvents.isPending} className="inline-flex min-h-8 items-center gap-1.5 px-2 text-xs font-semibold text-[var(--terracotta-dark)] underline-offset-4 hover:underline disabled:opacity-50"><X className="h-3.5 w-3.5" />{isEnglish ? "Remove" : "Bỏ ảnh"}</button>
          </div>
          <img src={imageDataUrl} alt={isEnglish ? "Selected duty roster" : "Ảnh lịch trực đã chọn"} className="max-h-80 w-full object-contain bg-[#f5f5f2]" />
        </div>
      )}

      {imageDataUrl && !proposal && (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm leading-5">
            <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#e23221]" />
            <span>{isEnglish ? "I agree to send this roster image to the configured Gemini service for extraction only. Gemini may process the image under its service terms; I will review all proposed shifts before saving." : "Tôi đồng ý gửi ảnh lịch trực này đến dịch vụ Gemini đã cấu hình chỉ để trích xuất dữ liệu. Gemini có thể xử lý ảnh theo điều khoản dịch vụ; tôi sẽ kiểm tra mọi ca được đề xuất trước khi lưu."}</span>
          </label>
          <button type="button" onClick={analyzeImage} disabled={!acknowledged || extract.isPending} className="inline-flex min-h-10 items-center gap-2 bg-[#e23221] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#bd271a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e23221] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {extract.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {extract.isPending ? (isEnglish ? "Reading roster…" : "Đang đọc lịch trực…") : (isEnglish ? "Read roster with Gemini" : "Đọc lịch trực với Gemini")}
          </button>
        </div>
      )}

      {proposal && (
        <div className="mt-5 border border-[var(--line)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{proposal.scheduleTitle}</p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{isEnglish ? `Gemini model: ${proposal.model} · Review each detected shift before adding it.` : `Mô hình Gemini: ${proposal.model} · Hãy kiểm tra từng ca trước khi thêm vào lịch.`}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">{selectedEntries.length}/{proposal.entries.length} {isEnglish ? "selected" : "đã chọn"}</span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--line)]">
            {proposal.entries.map(entry => {
              const selected = selectedKeys.has(entryKey(entry));
              return <label key={entryKey(entry)} className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition ${selected ? "bg-white" : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleEntry(entry)} className="sr-only" />
                <span className={`grid h-5 w-5 place-items-center border ${selected ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white" : "border-[var(--line-strong)] bg-white text-transparent"}`}>{selected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}</span>
                <span className="w-24 shrink-0 font-mono text-xs text-[var(--ink-muted)]">{formatVietnamDate(entry.date, language)}</span>
                <span className="w-8 shrink-0 rounded bg-[var(--terracotta-soft)] px-1.5 py-0.5 text-center text-xs font-bold text-[var(--terracotta-dark)]">{entry.shift}</span>
                <span className="min-w-0 flex-1 font-semibold">{entry.assignment}</span>
              </label>;
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs leading-5 text-[var(--ink-muted)]"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--terracotta)]" />{isEnglish ? "All entries are all-day events. No Telegram reminder is enabled." : "Mọi ca được tạo dạng lịch cả ngày. Hệ thống không bật nhắc Telegram."}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedKeys(new Set(proposal.entries.map(entryKey)))} className="min-h-9 px-2 text-xs font-semibold underline-offset-4 hover:text-[var(--terracotta)] hover:underline">{isEnglish ? "Select all" : "Chọn tất cả"}</button>
              <button type="button" onClick={addSelectedEvents} disabled={!selectedEntries.length || createEvents.isPending} className="inline-flex min-h-9 items-center gap-2 bg-[#e23221] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#bd271a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e23221] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {createEvents.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                {isEnglish ? `Add ${selectedEntries.length} to calendar` : `Thêm ${selectedEntries.length} ca vào lịch hẹn`}
              </button>
            </div>
          </div>
        </div>
      )}

      {!proposal && createEvents.isSuccess && <button type="button" onClick={onOpenCalendar} className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[var(--line-strong)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta-dark)]"><CalendarPlus className="h-3.5 w-3.5" />{isEnglish ? "Open calendar" : "Mở lịch hẹn"}</button>}
    </section>
  );
}
