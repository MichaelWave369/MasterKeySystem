import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// A runtime crash should never look like a successful, empty website.
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error, info) {
    console.error("Master Key System failed to render", error, info);
  }
  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: "100vh", padding: "3rem 1.5rem", background: "#101a1b", color: "#f6eedc", fontFamily: "system-ui, sans-serif" }}>
          <h1>The Master Key System</h1>
          <p>We couldn't display the reader. Please refresh, or open this page in a private window.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "0.7rem 1rem", cursor: "pointer" }}>Reload reader</button>
          <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>If this persists, report the browser console error on GitHub.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
