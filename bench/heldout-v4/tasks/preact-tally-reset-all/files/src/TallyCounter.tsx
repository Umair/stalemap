import { Component } from "preact";

interface TallyCounterProps {
  label: string;
}

interface TallyCounterState {
  count: number;
}

/** A click counter for one gate at the venue. */
export class TallyCounter extends Component<TallyCounterProps, TallyCounterState> {
  state: TallyCounterState = { count: 0 };

  increment = () => {
    this.setState(({ count }) => ({ count: count + 1 }));
  };

  reset() {
    this.setState({ count: 0 });
  }

  render() {
    return (
      <section class="tally">
        <h2>{this.props.label}</h2>
        <output>{this.state.count}</output>
        <button type="button" onClick={this.increment}>
          +1
        </button>
        <button type="button" onClick={() => this.reset()}>
          Reset
        </button>
      </section>
    );
  }
}
