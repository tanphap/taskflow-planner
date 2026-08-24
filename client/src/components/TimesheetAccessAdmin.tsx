import { useState } from "react";
import { Check, Eye, Loader2, Search, ShieldCheck, ShieldPlus, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import { matchesTimesheetAccountSearch } from "@shared/timesheetAccountSearch";

type AccessRole = "viewer" | "admin" | null;

export function TimesheetAccessAdmin() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [accountQuery, setAccountQuery] = useState("");
  const access = trpc.timesheet.access.useQuery();
  const accounts = trpc.timesheet.accounts.useQuery(undefined, { enabled: access.data?.canManage === true });
  const updateAccess = trpc.timesheet.setAccess.useMutation({
    onSuccess: async ({ accessRole }) => {
      await Promise.all([accounts.refetch(), access.refetch()]);
      const message = accessRole === "admin"
        ? (isEnglish ? "Timesheet administrator access granted" : "Đã cấp quyền Admin Timesheet")
        : accessRole === "viewer"
          ? (isEnglish ? "Timesheet viewing access granted" : "Đã cấp quyền xem chấm công")
          : (isEnglish ? "Timesheet access revoked" : "Đã thu hồi quyền Timesheet");
      toast.success(message);
    },
    onError: error => toast.error(error.message),
  });

  if (!access.data?.canManage) return null;

  const roleLabel = (role: AccessRole, isRoot: boolean) => {
    if (isRoot) return isEnglish ? "Owner" : "Chủ sở hữu";
    if (role === "admin") return isEnglish ? "Timesheet admin" : "Admin Timesheet";
    if (role === "viewer") return isEnglish ? "Viewer" : "Người xem";
    return isEnglish ? "No access" : "Chưa có quyền";
  };

  const actionClass = "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
  const isPendingFor = (userId: number, accessRole: AccessRole) => updateAccess.isPending && updateAccess.variables?.userId === userId && updateAccess.variables?.accessRole === accessRole;
  const allAccounts = accounts.data ?? [];
  const visibleAccounts = allAccounts.filter(account => matchesTimesheetAccountSearch(account, accountQuery));
  const permissionCounts = {
    admins: allAccounts.filter(account => account.accessRole === "admin").length,
    viewers: allAccounts.filter(account => account.accessRole === "viewer").length,
  };
  const formatLastSignedIn = (value: Date | string | null | undefined) => {
    if (!value) return isEnglish ? "No activity recorded" : "Chưa có hoạt động ghi nhận";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return isEnglish ? "No activity recorded" : "Chưa có hoạt động ghi nhận";
    return new Intl.DateTimeFormat(isEnglish ? "en-GB" : "vi-VN", { dateStyle: "medium" }).format(date);
  };

  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label text-[var(--terracotta)]">Admin / Timesheet</p>
          <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{isEnglish ? "Timesheet permissions" : "Quyền chấm công"}</h4>
        </div>
        <ShieldCheck className="mt-1 h-5 w-5 text-[var(--terracotta)]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
        {access.data.isRoot
          ? (isEnglish
            ? "As the owner, you can assign viewing access or appoint a Timesheet administrator. Delegated administrators can manage viewers but cannot appoint, demote, or remove other administrators."
            : "Là chủ sở hữu, bạn có thể cấp quyền xem hoặc bổ nhiệm Admin Timesheet. Admin được ủy quyền chỉ quản lý người xem, không thể bổ nhiệm, hạ quyền hoặc thu hồi quyền của Admin khác.")
          : (isEnglish
            ? "You can grant or revoke viewing access. Only the Timesheet owner can appoint or change Timesheet administrators."
            : "Bạn có thể cấp hoặc thu hồi quyền xem. Chỉ chủ sở hữu Timesheet mới có thể bổ nhiệm hoặc thay đổi quyền Admin Timesheet.")}
      </p>

      {accounts.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-muted)]"><Loader2 className="h-4 w-4 animate-spin" />{isEnglish ? "Loading accounts…" : "Đang tải tài khoản…"}</div>
      ) : accounts.isError ? (
        <p className="mt-4 text-sm text-[var(--terracotta-dark)]">{accounts.error.message}</p>
      ) : (
        <div className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
              <Users className="h-4 w-4 text-[var(--terracotta)]" aria-hidden="true" />
              <span>{isEnglish ? `${allAccounts.length} accounts · ${permissionCounts.admins} admins · ${permissionCounts.viewers} viewers` : `${allAccounts.length} tài khoản · ${permissionCounts.admins} Admin · ${permissionCounts.viewers} người xem`}</span>
            </div>
            <label className="relative block sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" aria-hidden="true" />
              <input
                type="search"
                value={accountQuery}
                onChange={event => setAccountQuery(event.target.value)}
                placeholder={isEnglish ? "Search name or email" : "Tìm tên hoặc email"}
                aria-label={isEnglish ? "Search Timesheet accounts by name or email" : "Tìm tài khoản Timesheet theo tên hoặc email"}
                className="min-h-10 w-full rounded-lg border border-[var(--line-strong)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--terracotta)] focus:ring-2 focus:ring-[var(--terracotta-soft)]"
              />
            </label>
          </div>
          <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {visibleAccounts.map(account => {
            const canChange = !account.isRoot;
            const canManageAccount = access.data.isRoot || account.accessRole !== "admin";
            const canManageView = canChange && canManageAccount;
            return (
              <div key={account.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--ink-muted)]"><UserRound className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold">{account.name || (isEnglish ? "Unnamed account" : "Tài khoản chưa đặt tên")}</p>
                  <p className="truncate text-xs text-[var(--ink-muted)]">{account.email || (isEnglish ? "No email" : "Chưa có email")}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{isEnglish ? "Last sign-in: " : "Đăng nhập gần nhất: "}{formatLastSignedIn(account.lastSignedIn)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${account.isRoot ? "bg-[var(--sage-soft)] text-[var(--sage)]" : account.accessRole === "admin" ? "bg-[var(--terracotta-soft)] text-[var(--terracotta-dark)]" : account.accessRole === "viewer" ? "bg-[var(--surface-soft)] text-[var(--ink-muted)]" : "bg-[var(--surface-soft)] text-[var(--ink-muted)]"}`}>
                  {roleLabel(account.accessRole, account.isRoot)}
                </span>
                {canManageView && (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                    {access.data.isRoot && account.accessRole !== "admin" && (
                      <button type="button" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate({ userId: account.id, accessRole: "admin" })} className={`${actionClass} border-[var(--terracotta)] text-[var(--terracotta-dark)] hover:bg-[var(--terracotta-soft)]`}>
                        {isPendingFor(account.id, "admin") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldPlus className="h-3.5 w-3.5" />}
                        {isEnglish ? "Make admin" : "Cấp Admin"}
                      </button>
                    )}
                    {account.accessRole === "admin" && access.data.isRoot && (
                      <button type="button" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate({ userId: account.id, accessRole: "viewer" })} className={`${actionClass} border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--terracotta)]`}>
                        {isPendingFor(account.id, "viewer") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        {isEnglish ? "Make viewer" : "Chuyển người xem"}
                      </button>
                    )}
                    {account.accessRole === null && (
                      <button type="button" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate({ userId: account.id, accessRole: "viewer" })} className={`${actionClass} border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--terracotta)]`}>
                        {isPendingFor(account.id, "viewer") ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {isEnglish ? "Allow view" : "Cho phép xem"}
                      </button>
                    )}
                    {account.accessRole !== null && (
                      <button type="button" disabled={updateAccess.isPending} onClick={() => updateAccess.mutate({ userId: account.id, accessRole: null })} className={`${actionClass} border-[var(--terracotta)] text-[var(--terracotta-dark)] hover:bg-[var(--terracotta-soft)]`}>
                        {isPendingFor(account.id, null) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        {isEnglish ? "Revoke" : "Thu hồi"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {visibleAccounts.length === 0 && (
            <div className="px-1 py-5 text-sm text-[var(--ink-muted)]">
              {isEnglish ? "No account matches this name or email." : "Không tìm thấy tài khoản khớp với tên hoặc email này."}
            </div>
          )}
          </div>
        </div>
      )}
    </section>
  );
}
