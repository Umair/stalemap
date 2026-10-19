import { z } from "zod";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

const Timestamp = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

const PartnerEvents = z.array(z.object({ id: z.string(), title: z.string(), start: Timestamp, end: Timestamp }));

export function parsePartnerEvents(json: unknown): CalendarEvent[] {
  return PartnerEvents.parse(json);
}
