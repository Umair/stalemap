import { z } from "zod";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

// With or without seconds: the default precision requires them, precision -1 is minutes only.
const Timestamp = z
  .union([z.iso.datetime({ offset: true }), z.iso.datetime({ offset: true, precision: -1 })])
  .transform((s) => new Date(s));

const PartnerEvents = z.array(z.object({ id: z.string(), title: z.string(), start: Timestamp, end: Timestamp }));

export function parsePartnerEvents(json: unknown): CalendarEvent[] {
  return PartnerEvents.parse(json);
}
