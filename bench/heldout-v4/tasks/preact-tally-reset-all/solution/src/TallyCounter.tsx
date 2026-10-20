import type { Ref } from "preact";
import { useImperativeHandle, useState } from "preact/hooks";

export interface TallyCounterHandle {
  reset(): void;
}

interface TallyCounterProps {
  label: string;
  ref?: Ref<TallyCounterHandle>;
}

/** A click counter for one gate at the venue. */
export function TallyCounter({ label, ref }: TallyCounterProps) {
  const [count, setCount] = useState(0);
  const reset = () => setCount(0);

  // Preact 11 passes `ref` to function components as a normal prop.
  useImperativeHandle(ref ?? null, () => ({ reset }), []);

  return (
    <section class="tally">
      <h2>{label}</h2>
      <output>{count}</output>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +1
      </button>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </section>
  );
}
