interface TallyCounterProps {
  label: string;
  count: number;
  onIncrement(): void;
  onReset(): void;
}

/** A click counter for one gate at the venue; the dashboard owns the count. */
export function TallyCounter({ label, count, onIncrement, onReset }: TallyCounterProps) {
  return (
    <section class="tally">
      <h2>{label}</h2>
      <output>{count}</output>
      <button type="button" onClick={onIncrement}>
        +1
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </section>
  );
}
