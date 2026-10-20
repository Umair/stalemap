import { Component } from "preact";
import { bindKey } from "./keyboard.ts";

const SHORTCUTS: [string, string][] = [
  ["?", "Show or hide this list"],
  ["/", "Search the docs"],
  ["g h", "Go to the home page"],
];

/** The floating "Keyboard shortcuts" helper we embed on partner pages. */
export class HelpWidget extends Component<{}, { open: boolean }> {
  state = { open: false };
  private unbind?: () => void;

  toggle = () => this.setState(({ open }) => ({ open: !open }));

  componentDidMount() {
    this.unbind = bindKey("?", this.toggle);
  }

  componentWillUnmount() {
    this.unbind?.();
  }

  render() {
    return (
      <div class="help-widget">
        <button type="button" onClick={this.toggle}>
          Keyboard shortcuts
        </button>
        {this.state.open && (
          <aside class="help-panel">
            <ul>
              {SHORTCUTS.map(([keys, what]) => (
                <li key={keys}>
                  <kbd>{keys}</kbd> {what}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    );
  }
}
