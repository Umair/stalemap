import { collection, doc, Timestamp, type CollectionReference } from "firebase/firestore";
import { db } from "./firebase.ts";

export type Role = "owner" | "admin" | "member";

export interface Member {
  role: Role;
  joinedAt: Timestamp;
}

export interface Team {
  name: string;
  /** Keyed by user id. */
  members: Record<string, Member>;
  /** When each member last opened the team, keyed by user id. */
  lastActive: Record<string, Timestamp>;
  /** Points each member has earned this season, keyed by user id. */
  points: Record<string, number>;
}

// Documents are stored exactly as Team, so reads and writes (updateDoc included) are type-checked against it.
export const teams = collection(db, "teams") as CollectionReference<Team, Team>;

export function teamRef(teamId: string) {
  return doc(teams, teamId);
}

/**
 * Changes a member's role.
 */
export async function setMemberRole(teamId: string, uid: string, role: Role): Promise<void> {
  throw new Error("not implemented");
}
