import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("SyncDraft render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-crash-screen">
          <div className="app-crash-card">
            <div className="brand-mark">SD</div>
            <h1>SyncDraft could not open this screen</h1>
            <p>The page encountered a frontend error. Your saved document data has not been intentionally changed.</p>
            <pre>{this.state.error.message}</pre>
            <button onClick={() => window.location.reload()}>Reload SyncDraft</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
