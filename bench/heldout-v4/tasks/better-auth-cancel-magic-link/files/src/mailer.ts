export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
