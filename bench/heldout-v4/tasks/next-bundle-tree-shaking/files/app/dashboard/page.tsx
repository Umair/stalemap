import { formatBytes, formatPercent } from "../lib/format";

export default function Dashboard() {
  return (
    <main>
      <p>Storage used: {formatBytes(734003200)}</p>
      <p>Uptime: {formatPercent(0.9993)}</p>
    </main>
  );
}
