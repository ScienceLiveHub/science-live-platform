/*
 * Send an email. Uses Resend by default.
 * You can replace the code with any provider like SMTP (e.g. via node-mailer), Mailgun, Mailchannels etc
 */

import { CreateEmailOptions, Resend } from "resend";

export function sendEmail(env: any, data: CreateEmailOptions) {
  const resend = new Resend(env.RESEND_API_KEY);
  return resend.emails.send(data);
}
