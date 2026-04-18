/**
 * main.jsx — esbuild entry point.
 * Mounts the React app into #root.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found. Check your HTML template.");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
