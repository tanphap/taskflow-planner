export type SearchableTimesheetAccount = {
  name: string | null;
  email: string | null;
};

export function normalizeTimesheetAccountSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLocaleLowerCase("vi");
}

export function matchesTimesheetAccountSearch(account: SearchableTimesheetAccount, query: string) {
  const normalizedQuery = normalizeTimesheetAccountSearch(query);
  if (!normalizedQuery) return true;
  return [account.name, account.email]
    .filter((value): value is string => Boolean(value))
    .some(value => normalizeTimesheetAccountSearch(value).includes(normalizedQuery));
}
