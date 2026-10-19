import type { Request, Response } from "express";
import { z } from "zod";
import { BookingRequest } from "./schemas.ts";

export function createBooking(req: Request, res: Response): void {
  const result = BookingRequest.safeParse(req.body);
  if (!result.success) {
    res.status(400).json(z.flattenError(result.error));
    return;
  }
  res.status(201).json({ ...result.data, status: "pending" });
}
