"use server";
import { revalidateTag, unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Stripe from "stripe";
import { z } from "zod";
import { format } from "date-fns";
import clsx from "clsx";

const Input = z.object({ email: z.string().email(), plan: z.nativeEnum({ Free: "free", Pro: "pro" } as const) });

export async function subscribe(form: FormData) {
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.flatten() };
  const jar = await cookies();
  const h = await headers();
  const stripe = new Stripe(process.env.STRIPE_KEY!);
  const anthropic = new Anthropic();
  const openaiClient = new OpenAI();
  revalidateTag("subscriptions");
  redirect("/thanks?d=" + format(new Date(), "yyyy-MM-dd") + clsx("a"));
}

export const getPlans = unstable_cache(async () => [], ["plans"]);
