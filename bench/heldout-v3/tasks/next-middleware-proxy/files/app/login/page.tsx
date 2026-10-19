export default async function LoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from = "/dashboard" } = await searchParams;
  return (
    <form method="post" action="/api/login">
      <input type="hidden" name="from" value={from} />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
  );
}
