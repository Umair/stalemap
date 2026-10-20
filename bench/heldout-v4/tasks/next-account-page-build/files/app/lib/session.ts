import { cookies } from "next/headers";

export interface Account {
  name: string;
  orders: number;
}

const accounts: Record<string, Account> = {
  "s-ada": { name: "Ada", orders: 3 },
  "s-grace": { name: "Grace", orders: 11 },
};

/** The signed-in account for this request, from the session cookie. */
export async function currentAccount(): Promise<Account | null> {
  const id = (await cookies()).get("session")?.value;
  return (id && accounts[id]) || null;
}
