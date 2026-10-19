import { z } from "zod";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export function parsePartnerEvents(json: unknown): CalendarEvent[] {
  throw new Error("not implemented");
}
