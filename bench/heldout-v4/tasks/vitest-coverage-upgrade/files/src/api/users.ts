import { getUser } from "./generated/client.ts";

export const loadUser = (id: string) => getUser(id);
