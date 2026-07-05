import nodemailer from "nodemailer";

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function envFlag(name: string): boolean {
  return process.env[name] === "true";
}

export function allowDevResetUrl(): boolean {
  return envFlag("ALLOW_DEV_RESET_URL");
}

export function allowDevInviteUrl(): boolean {
  return envFlag("ALLOW_DEV_INVITE_URL");
}

export function getPublicAppUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_URL || null;
}

export function buildAppUrl(path: string): string {
  const appUrl = getPublicAppUrl() || "http://localhost:3000";
  return new URL(path, appUrl).toString();
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function sendMail(message: MailMessage): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("SMTP email delivery is not configured");
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    ...message,
  });
}

export async function sendInvitationEmail(input: {
  to: string;
  name: string;
  activationUrl: string;
  expiresAt: Date;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: "You're invited to StoryDB",
    text: [
      `Hi ${input.name},`,
      "",
      "You've been invited to StoryDB. Set your password using this activation link:",
      input.activationUrl,
      "",
      `This link expires at ${input.expiresAt.toISOString()}.`,
    ].join("\n"),
    html: `
      <p>Hi ${input.name},</p>
      <p>You've been invited to StoryDB. Set your password using this activation link:</p>
      <p><a href="${input.activationUrl}">${input.activationUrl}</a></p>
      <p>This link expires at ${input.expiresAt.toISOString()}.</p>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  expiresAt: Date;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: "Reset your StoryDB password",
    text: [
      `Hi ${input.name},`,
      "",
      "Use this link to reset your StoryDB password:",
      input.resetUrl,
      "",
      `This link expires at ${input.expiresAt.toISOString()}.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${input.name},</p>
      <p>Use this link to reset your StoryDB password:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>This link expires at ${input.expiresAt.toISOString()}.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}
