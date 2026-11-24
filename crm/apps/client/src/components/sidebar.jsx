import React from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card p-4 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          C
        </div>
        <div>
          <p className="text-sm font-semibold">Curve Royalty Systems</p>
          <p className="text-xs text-muted-foreground">Customers Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.filter((link) => !link.hidden).filter((link) => (link.label === "Users" ? user?.role === "Admin" : true)).map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground"
                )
              }
              end={link.to === "/"}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
