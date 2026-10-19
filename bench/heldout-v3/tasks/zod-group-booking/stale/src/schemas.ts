import { z } from "zod";

export const BookingRequest = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.iso.date(),
    checkOut: z.iso.date(),
    guests: z.int().min(1).max(8),
  })
  .refine((b) => b.checkOut > b.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export type BookingRequest = z.infer<typeof BookingRequest>;

export const GroupBookingRequest = BookingRequest.extend({ guests: z.int().min(10).max(40) });
