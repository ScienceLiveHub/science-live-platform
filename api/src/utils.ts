import z from "zod";

export const ORCID_EMAIL_PLACEHOLDER = "@sciencelive-orcid-email-missing.com";

export const isValidEmail = (email?: string) => {
  try {
    z.email().parse(email);
  } catch {
    return false;
  }
  return email && !email.endsWith(ORCID_EMAIL_PLACEHOLDER);
};

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
