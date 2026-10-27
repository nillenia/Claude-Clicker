import { Component, type ReactNode } from 'react';
import { GameContext } from '../useGame';

interface State {
  error: Error | null;
  code: string;
}

/** Fängt Darstellungsfehler ab, damit der Spielstand gesichert werden kann. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  static contextType = GameContext;
  declare context: React.ContextType<typeof GameContext>;
  state: State = { error: null, code: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="tab-page">
        <section className="card wide danger">
          <h2>Da ist etwas schiefgelaufen</h2>
          <p className="small mono">{this.state.error.message}</p>
          <p className="small muted">Dein Spielstand ist nicht verloren. Sichere ihn zur Sicherheit als Code und lade die Seite neu.</p>
          <div className="button-row">
            <button onClick={() => this.setState({ code: this.context?.exportCode() ?? '' })}>Spielstand exportieren</button>
            <button className="primary" onClick={() => location.reload()}>
              Neu laden
            </button>
          </div>
          {this.state.code && <textarea readOnly rows={4} value={this.state.code} onFocus={(e) => e.target.select()} />}
        </section>
      </div>
    );
  }
}
