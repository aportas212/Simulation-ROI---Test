import { Component, type ReactNode } from 'react';
import { clearDraft } from '../lib/storage';

interface State {
  error: Error | null;
}

/** Affiche l'erreur au lieu d'une page blanche, avec un moyen de repartir des valeurs par défaut. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Une erreur est survenue</h1>
        <p className="mt-2 text-slate-600">
          L'application a rencontré un problème. Merci de transmettre le message ci-dessous à l'équipe ISITEC.
        </p>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-xs text-slate-800">
          {`${error.name}: ${error.message}\n${navigator.userAgent}`}
        </pre>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => this.setState({ error: null })}>
            Réessayer
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              clearDraft();
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Repartir des valeurs par défaut
          </button>
        </div>
      </div>
    );
  }
}
