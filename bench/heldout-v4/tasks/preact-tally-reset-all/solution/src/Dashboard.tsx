import { useRef } from "preact/hooks";
import { TallyCounter, type TallyCounterHandle } from "./TallyCounter.tsx";

export const GATES = ["North gate", "South gate", "VIP entrance"];

export function Dashboard() {
  const counters = useRef<Record<string, TallyCounterHandle | null>>({});

  const resetAll = () => {
    for (const gate of GATES) counters.current[gate]?.reset();
  };

  return (
    <main>
      <h1>Door counts</h1>
      <button type="button" onClick={resetAll}>
        Reset all
      </button>
      {GATES.map((gate) => (
        <TallyCounter
          key={gate}
          label={gate}
          ref={(handle: TallyCounterHandle | null) => {
            counters.current[gate] = handle;
          }}
        />
      ))}
    </main>
  );
}
