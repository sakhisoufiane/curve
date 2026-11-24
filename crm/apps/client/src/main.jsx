import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./styles/globals.css";
import { AuthProvider } from "@/lib/auth-context.jsx";
import { ToastProvider, ToastListener } from "@/components/ui/use-toast.jsx";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const THEME_KEY = "crm-theme";
const root = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light") {
  root.classList.remove("dark");
} else {
  root.classList.add("dark");
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ToastListener />
          <App />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
