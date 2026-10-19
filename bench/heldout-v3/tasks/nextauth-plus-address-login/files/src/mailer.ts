/** Sends a sign-in link through our transactional mail API. */
export async function sendSignInEmail(to: string, url: string): Promise<void> {
  const res = await fetch(process.env.MAIL_API_URL ?? "https://mail-api.acme.test/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MAIL_API_KEY ?? ""}` },
    body: JSON.stringify({ to, template: "sign-in", data: { url } }),
  });
  if (!res.ok) throw new Error(`Mail API responded with ${res.status}`);
}
