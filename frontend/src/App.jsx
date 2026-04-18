/**
 * App.jsx — Root component and single owner of auth state.
 *
 * useAuth() is called HERE and only here. login() and register() are passed
 * down as props so AuthPage's forms can trigger state changes in this
 * component — the only component that reads `user` to decide what to render.
 *
 * Why this matters:
 *   React useState is local to the component instance that calls the hook.
 *   If AuthPage called useAuth() itself, it would get its own independent
 *   copy of `user` state that App.jsx could never see. The UI would stay
 *   stuck on AuthPage even after a successful login.
 */
import React from "react";
import { useAuth } from "./hooks/useAuth.js";
import { AuthPage } from "./pages/AuthPage.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Spinner } from "./components/Spinner.jsx";

export default function App() {
  const { user, loading, login, register, logout } = useAuth();

  console.log("[App] render — loading:", loading, "user:", user?.username ?? null);

  // Boot screen — shown once on page load while the initial /api/auth/me runs
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-400 font-medium">Loading GymTune…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — pass login/register down so AuthPage never needs to
  // call useAuth() itself
  if (!user) {
    return (
      <AuthPage
        onLogin={login}
        onRegister={register}
      />
    );
  }

  // Authenticated
  return <Dashboard user={user} onLogout={logout} />;
}
