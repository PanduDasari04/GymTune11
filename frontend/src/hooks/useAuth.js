/**
 * useAuth — single source of truth for authentication state.
 *
 * ARCHITECTURE NOTE — why useAuth must only be called ONCE (in App.jsx):
 *   React hooks are NOT singletons. Every component that calls useAuth()
 *   gets its own independent copy of useState(null). If LoginForm called
 *   useAuth() and set user state there, App.jsx's separate useState would
 *   never see the change, so the UI would stay stuck on AuthPage forever.
 *
 *   Solution: useAuth() is called exclusively in App.jsx. The login() and
 *   register() functions are passed down as props to AuthPage → LoginForm /
 *   RegisterForm. State ownership lives in exactly one place.
 *
 * PREVIOUS BUG (now fixed):
 *   login() called checkSession() after the POST, which made a second network
 *   request to /api/auth/me. This was unnecessary and slow. The login endpoint
 *   already returns the username; the /api/auth/me endpoint returns the full
 *   user object. We now call setUser() directly from login() / register()
 *   using the data from /api/auth/me — one round-trip total, immediate state
 *   update, no timing issues.
 */
import { useState, useEffect, useCallback } from "react";
import api from "../lib/api.js";

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Initial session check on mount ────────────────────────────────────────
  // Runs once when the app boots. If a session cookie already exists (e.g. the
  // user refreshed the page while logged in), this restores their state.
  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/auth/me");
      const resolvedUser = data.authenticated ? data.user : null;
      console.log("[useAuth] checkSession result:", resolvedUser);
      setUser(resolvedUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // ── login ──────────────────────────────────────────────────────────────────
  // Posts credentials, then fetches the full user object from /api/auth/me and
  // calls setUser() directly. This is the ONLY place setUser is called after
  // a login — there is no secondary checkSession call, no race condition.
  const login = async (email, password) => {
    setError(null);

    // Step 1: authenticate and set the session cookie
    await api.post("/api/auth/login", { email, password });

    // Step 2: fetch the full user object now that the cookie is set
    const meData = await api.get("/api/auth/me");
    const loggedInUser = meData.authenticated ? meData.user : null;

    // Step 3: write directly into this hook's state — the same useState that
    //         App.jsx reads. One owner, one update, guaranteed re-render.
    console.log("[useAuth] User state updated:", loggedInUser);
    setUser(loggedInUser);

    return loggedInUser;
  };

  // ── register ───────────────────────────────────────────────────────────────
  const register = async (fields) => {
    setError(null);

    await api.post("/api/auth/register", fields);

    const meData = await api.get("/api/auth/me");
    const newUser = meData.authenticated ? meData.user : null;

    console.log("[useAuth] User state updated:", newUser);
    setUser(newUser);

    return newUser;
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await api.get("/logout"); } catch { /* ignore */ }
    console.log("[useAuth] User state updated:", null);
    setUser(null);
  };

  return { user, loading, error, login, register, logout };
}
