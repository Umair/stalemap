import { memo } from "preact/compat";

export interface Day {
  /** ISO date, e.g. "2026-10-05". */
  date: string;
  commits: number;
}

const CELL = 12;
const GAP = 2;
const GREEN = "#216e39";

/** A GitHub-style contribution grid: one column per week, one row per weekday. */
export const ActivityHeatmap = memo(function ActivityHeatmap({ days }: { days: Day[] }) {
  const weeks = Math.ceil(days.length / 7);
  const busiest = Math.max(1, ...days.map((d) => d.commits));
  return (
    <svg class="heatmap" width={weeks * (CELL + GAP)} height={7 * (CELL + GAP)} role="img" aria-label="Commit activity">
      {days.map((day, i) => (
        <rect
          key={day.date}
          data-date={day.date}
          x={Math.floor(i / 7) * (CELL + GAP)}
          y={(i % 7) * (CELL + GAP)}
          width={CELL}
          height={CELL}
          rx={2}
          style={{ fill: GREEN, fillOpacity: Math.max(0.1, day.commits / busiest) }}
        >
          <title>{`${day.commits} commits on ${day.date}`}</title>
        </rect>
      ))}
    </svg>
  );
});
