import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** SMTP transport for the internal relay (plain SMTP on the private network). */
export function createMailer(host = process.env.SMTP_HOST ?? "relay.internal", port = Number(process.env.SMTP_PORT ?? 25)): Transporter {
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: true,
    // TCP connect should be quick; the greeting may take a few seconds (greet pause), capped at 9 s
    connectionTimeout: 2_000,
    greetingTimeout: 9_000,
    socketTimeout: 30_000,
  });
}

/** Sends an ops alert and resolves with the relay's reply. */
export async function sendAlert(mailer: Transporter, subject: string, text: string): Promise<string> {
  const info = await mailer.sendMail({ from: "alerts@example.com", to: "oncall@example.com", subject, text });
  return info.response ?? "";
}
