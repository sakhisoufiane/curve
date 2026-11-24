import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthPage } from "@/pages/auth";
import { UserDetailPage } from "@/pages/user-detail";
import { ClientsPage } from "@/pages/clients";
import { ClientDetailPage } from "@/pages/client-detail";
import { DashboardPage } from "@/pages/dashboard";
import { DealsPage } from "@/pages/deals";
import { LeadsPage } from "@/pages/leads";
import { SettingsPage } from "@/pages/settings";
import { UsersPage } from "@/pages/users";
import { TeamPage } from "@/pages/team";
import { PersonDetailPage } from "@/pages/person-detail";
import { CustomersPage } from "@/pages/customers";
import { CustomerDetailPage } from "@/pages/customer-detail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/customers" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/team/:id" element={<PersonDetailPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/deals" element={<DealsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
