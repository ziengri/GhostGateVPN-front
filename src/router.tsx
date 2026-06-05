import { createBrowserRouter, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./ui/ProtectedRoute";
import { DownloadPage } from "./pages/DownloadPage";
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
        <DownloadPage />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/app" replace /> },
]);
