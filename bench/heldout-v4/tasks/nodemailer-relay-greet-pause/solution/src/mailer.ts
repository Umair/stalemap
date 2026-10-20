import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** SMTP transport for the internal relay (plain SMTP on the private network). */
export function createMailer(host = process.env.SMTP_HOST ?? "relay.internal", port = Number(process.env.SMTP_PORT ?? 25)): Transporter {
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    ignoreTLS: true,
    // the relay pauses ~3 s before greeting; give up on a silent relay after 10 s
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

/** Sends an ops alert and resolves with the relay's reply. */
export async function sendAlert(mailer: Transporter, subject: string, text: string): Promise<string> {
  const info = await mailer.sendMail({ from: "alerts@example.com", to: "oncall@example.com", subject, text });
  return info.response ?? "";
}
