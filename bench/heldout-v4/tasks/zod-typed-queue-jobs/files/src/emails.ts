import { z } from "zod";
import { defineJob } from "./jobs.ts";

export const sent: { to: string; subject: string }[] = [];

export const WelcomeEmail = z.object({
  email: z.email(),
  name: z.string().min(1),
});

export const sendWelcomeEmail = defineJob("send-welcome-email", WelcomeEmail, async (payload) => {
  sent.push({ to: payload.email, subject: `Welcome, ${payload.name}!` });
});
