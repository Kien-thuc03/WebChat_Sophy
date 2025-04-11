import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./App";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./features/auth/providers/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
