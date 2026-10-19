import type { Request, Response } from "express";
import { z } from "zod";
import { parseBody } from "../validation.ts";

export const CreateUser = z.object({
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(["member", "admin"]).default("member"),
});

export function createUserHandler(req: Request, res: Response): void {
  const user = parseBody("POST /users", CreateUser, req.body);
  res.status(201).json(user);
}
