import { createRef } from "preact";
import { TallyCounter } from "./TallyCounter.tsx";

export const GATES = ["North gate", "South gate", "VIP entrance"];

const counterRefs = GATES.map(() => createRef<TallyCounter>());

export function Dashboard() {
  const resetAll = () => {
    for (const ref of counterRefs) ref.current?.reset();
  };

  return (
    <main>
      <h1>Door counts</h1>
      <button type="button" onClick={resetAll}>
        Reset all
      </button>
      {GATES.map((gate, i) => (
        <TallyCounter key={gate} label={gate} ref={counterRefs[i]} />
      ))}
    </main>
  );
}
