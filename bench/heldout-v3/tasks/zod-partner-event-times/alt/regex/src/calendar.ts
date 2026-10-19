import { z } from "zod";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

const timestamp = z
  .string()
  .regex(ISO_WITH_OFFSET, "Expected an ISO 8601 timestamp with an offset")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
  .pipe(z.coerce.date());

const PartnerEvent = z.object({ id: z.string(), title: z.string(), start: timestamp, end: timestamp });

export function parsePartnerEvents(json: unknown): CalendarEvent[] {
  const result = z.array(PartnerEvent).safeParse(json);
  if (!result.success) throw new Error(`Bad partner payload: ${z.prettifyError(result.error)}`);
  return result.data;
}
