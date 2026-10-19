export async function GET() {
  const rows = [
    ["date", "description", "amount"],
    ["2026-10-01", "Office rent", "-1200.00"],
    ["2026-10-03", "Invoice #1042", "3400.00"],
  ];
  return new Response(rows.map((r) => r.join(",")).join("\n"), {
    headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="transactions.csv"' },
  });
}
