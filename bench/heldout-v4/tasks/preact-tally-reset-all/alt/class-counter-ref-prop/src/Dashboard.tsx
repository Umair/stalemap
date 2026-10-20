import { createRef } from "preact";
import type { RefObject } from "preact";
import { TallyCounter } from "./TallyCounter.tsx";

export const GATES = ["North gate", "South gate", "VIP entrance"];

const counterRefs: RefObject<TallyCounter | null>[] = GATES.map(() => createRef<TallyCounter | null>());

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
        <TallyCounter key={gate} label={gate} counterRef={counterRefs[i]} />
      ))}
    </main>
  );
}
