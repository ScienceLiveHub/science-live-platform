/*
 * Send an email. Uses Resend by default.
 * You can replace the code with any provider like SMTP (e.g. via node-mailer), Mailgun, Mailchannels etc
 */

import { CreateEmailOptions, Resend } from "resend";

// This is used if a `from` field is not specified
export const DEFAULT_SENDER =
  "Science Live Platform <noreply@sciencelive4all.org>";

export function sendEmail(
  env: any,
  data: Omit<CreateEmailOptions, "from"> & { from?: string },
) {
  data.from = data.from ?? DEFAULT_SENDER;
  const resend = new Resend(env.RESEND_API_KEY);
  return resend.emails.send(data as CreateEmailOptions);
}
