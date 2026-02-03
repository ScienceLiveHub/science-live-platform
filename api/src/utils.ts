export type NotificationType =
  | "invite"
  | "approval"
  | "message"
  | "info"
  | "warning"
  | "error";

export const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
