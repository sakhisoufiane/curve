import React from "react";
import { LogOut, Menu, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "@/lib/navigation";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useCustomers, useClients, usePeople, useUsers } from "@/lib/queries";

export function Topbar() {
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains("dark"));
  const { user, logout } = useAuth();
  const location = useLocation();
  const customerMatch = useMatch("/customers/:id");
  const clientMatch = useMatch("/clients/:id");
  const personMatch = useMatch("/team/:id");
  const userMatch = useMatch("/users/:id");
  const { data: customers = [] } = useCustomers();
  const { data: clients = [] } = useClients();
  const { data: people = [] } = usePeople();
  const { data: users = [] } = useUsers();
  const activeLabel = React.useMemo(() => {
    if (customerMatch) {
      const { id } = customerMatch.params;
      if (id === "new") return "New Customer";
      const customer = customers.find((c) => c.id === id);
      return customer?.businessLegalName || "Customer";
    }
    if (clientMatch) {
      const { id } = clientMatch.params;
      if (id === "new") return "New Client";
      const client = clients.find((c) => c.id === id);
      return client?.name || "Client";
    }
    if (personMatch) {
      const { id } = personMatch.params;
      if (id === "new") return "New Person";
      const person = people.find((p) => p.id === id);
      return person?.name || "Person";
    }
    if (userMatch) {
      const { id } = userMatch.params;
      if (id === "new") return "New User";
      const u = users.find((u) => u.id === id);
      return u?.email || "User";
    }
    const match = navItems.find((item) => location.pathname.startsWith(item.to));
    if (match) return match.label;
    return "";
  }, [location.pathname, customerMatch, clientMatch, personMatch, userMatch, customers, clients, people, users]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("crm-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("crm-theme", "light");
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-8">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-4">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle>Curve Royalty Systems</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1">
              {navItems
                .filter((link) => !link.hidden)
                .filter((link) => (link.label === "Users" ? user?.role === "Admin" : true))
                .map((link) => {
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
          </SheetContent>
        </Sheet>
        <div className="text-sm font-medium">{activeLabel}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {user?.email || "Account"}
        </span>
        <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" aria-label="Sign out" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
