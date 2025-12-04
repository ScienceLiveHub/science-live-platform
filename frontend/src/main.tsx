import ErrorComponent from "@/components/error";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Most UI issues will be caught by the built-in Vite error boundary, but some higher level crashes that cause a blank screen, will be caught here */}
    <ErrorBoundary FallbackComponent={ErrorComponent}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
