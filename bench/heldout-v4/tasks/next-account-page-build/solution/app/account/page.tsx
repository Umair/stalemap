export const instant = false;

import Link from "next/link";
import { currentAccount } from "../lib/session";

export default async function AccountPage() {
  const account = await currentAccount();
  if (!account) {
    return (
      <main>
        <p>You are signed out.</p>
        <Link href="/">Back to the store</Link>
      </main>
    );
  }
  return (
    <main>
      <h1>Welcome back, {account.name}</h1>
      <p>You have placed {account.orders} orders.</p>
    </main>
  );
}
