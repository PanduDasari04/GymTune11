/**
 * AuthPage.jsx
 *
 * Receives login() and register() as props from App.jsx.
 * Does NOT call useAuth() — state ownership stays in App.
 */
import React, { useState } from "react";
import { Spinner } from "../components/Spinner.jsx";

// ── Shared primitives ─────────────────────────────────────────────────────────

function InputField({ label, id, type = "text", value, onChange, placeholder, required = false }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   placeholder:text-gray-300 transition bg-white"
      />
    </div>
  );
}

function Alert({ message, variant }) {
  if (!message) return null;
  const styles = {
    error:   "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
  };
  const icons = { error: "⚠", success: "✓" };
  return (
    <div className={`flex items-center gap-2 p-3 border rounded-xl text-sm ${styles[variant]}`}>
      <span>{icons[variant]}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
// Accepts onLogin prop — the login() function from useAuth in App.jsx.
// Calling onLogin() updates App's user state directly, causing App to re-render
// and swap AuthPage for Dashboard.

function LoginForm({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
      // No navigation needed — App.jsx re-renders automatically when user state updates
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert message={error} variant="error" />
      <InputField label="Email address" id="login-email" type="email"
        value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com" required />
      <InputField label="Password" id="login-password" type="password"
        value={password} onChange={e => setPassword(e.target.value)}
        placeholder="••••••••" required />
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                   text-white font-semibold rounded-xl transition text-sm
                   flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" />}
        {loading ? "Signing in…" : "Sign In →"}
      </button>
    </form>
  );
}

// ── Register Form ─────────────────────────────────────────────────────────────
// Accepts onRegister prop — the register() function from useAuth in App.jsx.

function RegisterForm({ onRegister }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [fields,  setFields]  = useState({
    username: "", email: "", password: "",
    age: "", weight: "", height: "", goal: "general_fitness",
  });

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password } = fields;
    if (!username || !email || !password) {
      setError("Username, email and password are required."); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true);
    setError("");
    try {
      await onRegister({
        ...fields,
        age:    fields.age    ? Number(fields.age)    : null,
        weight: fields.weight ? Number(fields.weight) : null,
        height: fields.height ? Number(fields.height) : null,
      });
      setSuccess("Account created! Loading dashboard…");
      // App.jsx re-renders automatically — no redirect needed
    } catch (err) {
      setError(err.message || "Registration failed. Username or email may already exist.");
    } finally {
      setLoading(false);
    }
  };

  const goals = [
    ["general_fitness", "🏃 General Fitness"],
    ["muscle_gain",     "💪 Muscle Gain"],
    ["fat_loss",        "🔥 Fat Loss"],
    ["endurance",       "🚴 Endurance"],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert message={error}   variant="error"   />
      <Alert message={success} variant="success" />

      <div className="grid grid-cols-2 gap-3">
        <InputField label="Username" id="reg-username" value={fields.username}
          onChange={set("username")} placeholder="athlete_01" required />
        <InputField label="Email" id="reg-email" type="email" value={fields.email}
          onChange={set("email")} placeholder="you@email.com" required />
      </div>
      <InputField label="Password" id="reg-password" type="password" value={fields.password}
        onChange={set("password")} placeholder="Min 6 characters" required />

      <div className="grid grid-cols-3 gap-3">
        <InputField label="Age"         id="reg-age"    type="number" value={fields.age}
          onChange={set("age")} placeholder="25" />
        <InputField label="Weight (kg)" id="reg-weight" type="number" value={fields.weight}
          onChange={set("weight")} placeholder="70" />
        <InputField label="Height (cm)" id="reg-height" type="number" value={fields.height}
          onChange={set("height")} placeholder="175" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Fitness Goal</label>
        <select value={fields.goal} onChange={set("goal")}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {goals.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
        </select>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                   text-white font-semibold rounded-xl transition text-sm
                   flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" />}
        {loading ? "Creating account…" : "Create Account →"}
      </button>
    </form>
  );
}

// ── Auth Page ─────────────────────────────────────────────────────────────────

export function AuthPage({ onLogin, onRegister }) {
  const [tab, setTab] = useState("login");

  const TabBtn = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition
        ${tab === id ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-white border-r border-gray-100 flex-col justify-center px-16">
        <div className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Gym<span className="text-blue-600">Tune</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
          Train smarter.<br />
          <span className="text-blue-600">Never quit.</span>
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-sm">
          AI-powered fitness tracking with machine learning dropout prediction,
          science-backed calorie analytics, and personalised nutrition planning.
        </p>
        <ul className="space-y-3">
          {[
            ["🤖", "ML quit prediction (92.5% accuracy)"],
            ["📊", "Real-time analytics dashboard"],
            ["🔥", "7,700 kcal fat-loss science"],
            ["🥗", "Personalised meal planning"],
            ["📈", "Tableau-ready BI export"],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-base">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="lg:hidden text-2xl font-bold tracking-tight text-gray-900 mb-6">
            Gym<span className="text-blue-600">Tune</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {/* Tab switcher */}
            <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
              <TabBtn id="login"    label="Sign In"  />
              <TabBtn id="register" label="Register" />
            </div>

            {tab === "login"
              ? <LoginForm    onLogin={onLogin}       />
              : <RegisterForm onRegister={onRegister} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
