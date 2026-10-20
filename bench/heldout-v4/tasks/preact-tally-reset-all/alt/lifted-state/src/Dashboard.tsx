import { useState } from "preact/hooks";
import { TallyCounter } from "./TallyCounter.tsx";

export const GATES = ["North gate", "South gate", "VIP entrance"];

const zeroes = () => Object.fromEntries(GATES.map((gate) => [gate, 0])) as Record<string, number>;

export function Dashboard() {
  const [counts, setCounts] = useState(zeroes);
  const set = (gate: string, value: (n: number) => number) => setCounts((all) => ({ ...all, [gate]: value(all[gate]) }));

  return (
    <main>
      <h1>Door counts</h1>
      <button type="button" onClick={() => setCounts(zeroes())}>
        Reset all
      </button>
      {GATES.map((gate) => (
        <TallyCounter
          key={gate}
          label={gate}
          count={counts[gate]}
          onIncrement={() => set(gate, (n) => n + 1)}
          onReset={() => set(gate, () => 0)}
        />
      ))}
    </main>
  );
}
