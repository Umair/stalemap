import { z } from "zod";

export enum Role {
  Admin = "admin",
  Member = "member",
}

export const RoleSchema = z.enum(Role);
