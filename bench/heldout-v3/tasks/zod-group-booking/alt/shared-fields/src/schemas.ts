import { z } from "zod";

const BookingFields = z.object({
  roomId: z.string().min(1),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.int().min(1).max(8),
});

const checkOutAfterCheckIn = (b: { checkIn: string; checkOut: string }) => b.checkOut > b.checkIn;
const datesMessage = { message: "Check-out must be after check-in", path: ["checkOut"] };

export const BookingRequest = BookingFields.refine(checkOutAfterCheckIn, datesMessage);

export type BookingRequest = z.infer<typeof BookingRequest>;

export const GroupBookingRequest = BookingFields.extend({ guests: z.int().min(10).max(40) }).refine(checkOutAfterCheckIn, datesMessage);
