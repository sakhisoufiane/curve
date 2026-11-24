import React from "react";
import { useLocation } from "react-router-dom";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function AppShell({ children }) {
  const location = useLocation();

  React.useEffect(() => {
    const path = location.pathname;
    let title = "Customers";
    if (path.startsWith("/dashboard")) title = "Dashboard";
    if (path.startsWith("/customers")) title = "Customers";
    if (path.startsWith("/clients")) title = "Clients";
    if (path.startsWith("/team")) title = "Team";
    if (path.startsWith("/users")) title = "Users";
    if (path.startsWith("/leads")) title = "Leads";
    if (path.startsWith("/deals")) title = "Deals";
    if (path.startsWith("/settings")) title = "Settings";
    document.title = `${title} - Curve Royalty Systems`;
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 space-y-6 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
