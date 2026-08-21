export type BellEmailMessage = { status: string };

/** Selects the records that should make the in-app notification bell active. */
export function getNotificationBellData<TEmail extends BellEmailMessage, TDueNotification>(emails: TEmail[], dueNotifications: TDueNotification[]) {
  const newEmails = emails.filter(email => email.status === "new");
  return {
    newEmails,
    dueNotifications,
    total: newEmails.length + dueNotifications.length,
  };
}
