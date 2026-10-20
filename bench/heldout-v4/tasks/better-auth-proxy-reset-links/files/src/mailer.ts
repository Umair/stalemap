export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Messages handed to the mail provider (the provider client is wired up in production). */
export const outbox: Mail[] = [];

export async function sendMail(mail: Mail): Promise<void> {
  outbox.push(mail);
}
