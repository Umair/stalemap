import * as React from "react";
import { durationLabel, lastRunLabel } from "./format.ts";

export type Status = "passing" | "failing" | "running";

export interface StatusBadgeProps {
  name: string;
  status: Status;
  lastRun: string;
  durationSeconds: number;
  now: string;
}

const COLORS: Record<Status, string> = { passing: "#1a7f37", failing: "#cf222e", running: "#9a6700" };

export function StatusBadge({ name, status, lastRun, durationSeconds, now }: StatusBadgeProps): React.ReactElement {
  const title = `${name}: ${status} ${lastRunLabel(lastRun, now)} (${durationLabel(durationSeconds)})`;
  return (
    <span className="status-badge" data-status={status} title={title} style={{ borderColor: COLORS[status] }}>
      <span className="status-badge__name">{name}</span>
      <span className="status-badge__state">{status}</span>
    </span>
  );
}

export function StatusList({ checks, now }: { checks: Omit<StatusBadgeProps, "now">[]; now: string }): React.ReactElement {
  const failing = checks.filter((c) => c.status === "failing").length;
  return (
    <section aria-label="Checks">
      <h2>{failing === 0 ? "All checks passing" : `${failing} failing`}</h2>
      <ul>
        {checks.map((c) => (
          <li key={c.name}>
            <StatusBadge {...c} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
