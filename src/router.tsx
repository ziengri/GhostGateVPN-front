import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "./ui/AppLayout";
import { ProtectedRoute } from "./ui/ProtectedRoute";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PasswordResetPage } from "./pages/PasswordResetPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/password-reset", element: <PasswordResetPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/app" replace /> },
]);

