import { TallyCounter } from "./TallyCounter.tsx";

export const GATES = ["North gate", "South gate", "VIP entrance"];

export function Dashboard() {
  return (
    <main>
      <h1>Door counts</h1>
      {GATES.map((gate) => (
        <TallyCounter key={gate} label={gate} />
      ))}
    </main>
  );
}
