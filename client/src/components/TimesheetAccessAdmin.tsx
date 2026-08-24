import { Check, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

export function TimesheetAccessAdmin() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const access = trpc.timesheet.access.useQuery();
  const accounts = trpc.timesheet.accounts.useQuery(undefined, { enabled: access.data?.canManage === true });
  const updateAccess = trpc.timesheet.setAccess.useMutation({
    onSuccess: async ({ allowed }) => {
      await accounts.refetch();
      toast.success(allowed ? (isEnglish ? "Timesheet access granted" : "Đã cấp quyền xem chấm công") : (isEnglish ? "Timesheet access revoked" : "Đã thu hồi quyền xem chấm công"));
    },
    onError: error => toast.error(error.message),
  });

  if (!access.data?.canManage) return null;
  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label text-[var(--terracotta)]">Admin / Timesheet</p>
          <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{isEnglish ? "Timesheet access" : "Quyền xem chấm công"}</h4>
        </div>
        <ShieldCheck className="mt-1 h-5 w-5 text-[var(--terracotta)]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{isEnglish ? "Only accounts you approve can open the shared Timesheet dashboard. You can revoke access at any time." : "Chỉ tài khoản bạn phê duyệt mới có thể mở dashboard chấm công dùng chung. Bạn có thể thu hồi quyền bất cứ lúc nào."}</p>
      {accounts.isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-muted)]"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? "Loading accounts…" : "Đang tải tài khoản…"}</div> : accounts.isError ? <p className="mt-4 text-sm text-[var(--terracotta-dark)]">{accounts.error.message}</p> : <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {(accounts.data ?? []).map(account => <div key={account.id} className="flex items-center gap-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--ink-muted)]"><UserRound className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name || (isEnglish ? "Unnamed account" : "Tài khoản chưa đặt tên")}</p><p className="truncate text-xs text-[var(--ink-muted)]">{account.email || (isEnglish ? "No email" : "Chưa có email")}</p></div>
          {account.isOwner ? <span className="rounded-full bg-[var(--sage-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--sage)]">{isEnglish ? "Admin" : "Quản trị"}</span> : <button type="button" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate({ userId: account.id, allowed: !account.granted })} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${account.granted ? "border-[var(--terracotta)] text-[var(--terracotta-dark)] hover:bg-[var(--terracotta-soft)]" : "border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--terracotta)]"}`}>
            {updateAccess.isPending && updateAccess.variables?.userId === account.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : account.granted ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {account.granted ? (isEnglish ? "Revoke" : "Thu hồi") : (isEnglish ? "Allow" : "Cho phép")}
          </button>}
        </div>)}
      </div>}
    </section>
  );
}
