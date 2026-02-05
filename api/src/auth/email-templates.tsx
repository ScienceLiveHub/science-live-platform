import { EmailTemplate } from "better-auth-ui/server";

export const orgInviteEmailTemplate = (
  name: string,
  baseUrl: string,
  link: string,
) =>
  EmailTemplate({
    imageUrl: `${baseUrl}/sciencelive-logo-small.webp`,
    action: "Organization Invitation",
    content: (
      <>
        <p>{`Hello ${name},`}</p>
        <p>Click the button below to view the invitation.</p>
      </>
    ),
    heading: "Organization Invitation",
    siteName: "Science Live Platform",
    baseUrl: baseUrl,
    url: link,
    classNames: { button: "bg-pink-500" }, //TODO: not sure these tailwind styles work in the email
  });

export const verifyEmailTemplate = (
  name: string,
  baseUrl: string,
  link: string,
) =>
  EmailTemplate({
    imageUrl: `${baseUrl}/sciencelive-logo-small.webp`,
    action: "Verify Email",
    content: (
      <>
        <p>{`Hello ${name},`}</p>
        <p>Click the button below to verify your email address.</p>
        <p className="italic">
          This link is only valid for 1 hour. You can{" "}
          <a href={`${baseUrl}/account/settings`}>send it again</a> if required.
        </p>
      </>
    ),
    heading: "Verify Email",
    siteName: "Science Live Platform",
    baseUrl: baseUrl,
    url: link,
    classNames: { button: "bg-pink-500" }, //TODO: not sure these tailwind styles work in the email
  });

export const changeEmailTemplate = (
  name: string,
  baseUrl: string,
  link: string,
) =>
  EmailTemplate({
    imageUrl: `${baseUrl}/sciencelive-logo-small.webp`,
    action: "Confirm Email Change",
    content: (
      <>
        <p>{`Hello ${name},`}</p>
        <p>Click the button below to confirm your email address change.</p>
      </>
    ),
    heading: "Confirm Email Change",
    siteName: "Science Live Platform",
    baseUrl: baseUrl,
    url: link,
    classNames: { button: "bg-pink-500" },
  });

export const resetPasswordTemplate = (
  name: string,
  baseUrl: string,
  link: string,
) =>
  EmailTemplate({
    imageUrl: `${baseUrl}/sciencelive-logo-small.webp`,
    action: "Reset Password",
    content: (
      <>
        <p>{`Hello ${name},`}</p>
        <p>Click the button below to reset your password.</p>
      </>
    ),
    heading: "Reset Password",
    siteName: "Science Live Platform",
    baseUrl: baseUrl,
    url: link,
    classNames: { button: "bg-pink-500" },
  });
