import { Building2, Handshake, LayoutDashboard, Megaphone, Settings, Users, UserSquare2, UsersRound } from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hidden: true },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/team", label: "Team", icon: UsersRound },
  { to: "/users", label: "Users", icon: UserSquare2 },
  { to: "/leads", label: "Leads", icon: Megaphone, hidden: true },
  { to: "/deals", label: "Deals", icon: Handshake, hidden: true },
  { to: "/settings", label: "Settings", icon: Settings, hidden: true }
];
