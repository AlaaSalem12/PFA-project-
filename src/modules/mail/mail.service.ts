import nodemailer from "nodemailer";
import { env } from "../../config/env";

export interface MailService {
  sendWelcome(input: { to: string; fullName: string; username: string; temporaryPassword: string }): Promise<boolean>;
  sendPasswordReset(input: { to: string; fullName: string; token: string }): Promise<boolean>;
}

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const plainWelcome = (input: { fullName: string; username: string; temporaryPassword: string }) =>
  `Hello ${input.fullName},\n\nUsername: ${input.username}\nTemporary password: ${input.temporaryPassword}\nLogin: ${env.FRONTEND_URL}/login\n\nChange your password at first login.`;

const htmlWelcome = (input: { fullName: string; username: string; temporaryPassword: string }) =>
  `<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Metal HR account</h2><p>Hello ${escapeHtml(input.fullName)},</p><p>Your account is ready.</p><p><b>Username:</b> ${escapeHtml(input.username)}<br><b>Temporary password:</b> ${escapeHtml(input.temporaryPassword)}</p><p><a href="${env.FRONTEND_URL}/login">Sign in to Metal HR</a></p><p>Please change this password immediately after your first login.</p></div>`;

const plainReset = (input: { fullName: string; token: string }) =>
  `Hello ${input.fullName},\n\nReset your password: ${env.FRONTEND_URL}/reset-password?token=${input.token}\nThis link expires in one hour.`;

const htmlReset = (input: { fullName: string; token: string }) =>
  `<div style="font-family:Arial,sans-serif;max-width:600px"><h2>Metal HR password reset</h2><p>Hello ${escapeHtml(input.fullName)},</p><p><a href="${env.FRONTEND_URL}/reset-password?token=${input.token}">Reset your password</a></p><p>This link expires in one hour.</p></div>`;

class SmtpMailService implements MailService {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  private get from(): string | undefined {
    return env.SMTP_FROM ?? env.SMTP_USER;
  }

  async sendWelcome(input: { to: string; fullName: string; username: string; temporaryPassword: string }): Promise<boolean> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: "Your Metal HR account",
      text: plainWelcome(input),
      html: htmlWelcome(input),
    });
    return true;
  }

  async sendPasswordReset(input: { to: string; fullName: string; token: string }): Promise<boolean> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: "Reset your Metal HR password",
      text: plainReset(input),
      html: htmlReset(input),
    });
    return true;
  }
}

class DevelopmentMailService implements MailService {
  async sendWelcome(input: { to: string; fullName: string; username: string; temporaryPassword: string }): Promise<boolean> {
    console.info(`[mail] welcome email queued for ${input.to} (${input.username})`);
    return true;
  }

  async sendPasswordReset(input: { to: string; fullName: string; token: string }): Promise<boolean> {
    console.info(`[mail] password reset email queued for ${input.to}`);
    if (env.NODE_ENV === "development") {
      console.info(`[mail] DEV reset link: ${env.FRONTEND_URL}/reset-password?token=${input.token}`);
    }
    return true;
  }
}

export const mailService: MailService = env.SMTP_HOST ? new SmtpMailService() : new DevelopmentMailService();
