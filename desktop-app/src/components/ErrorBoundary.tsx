import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#1e1e2e",
          color: "#cdd6f4",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <h2 style={{ color: "#f38ba8", marginBottom: "12px" }}>Something went wrong</h2>
          <p style={{ color: "#a6adc8", marginBottom: "24px", fontSize: "14px", textAlign: "center" }}>
            The application encountered an unexpected error.
          </p>
          <pre style={{
            backgroundColor: "#313244",
            padding: "16px",
            borderRadius: "6px",
            fontSize: "12px",
            maxWidth: "90%",
            overflowX: "auto",
            color: "#f38ba8"
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "24px",
              padding: "8px 16px",
              backgroundColor: "#89b4fa",
              color: "#11111b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
