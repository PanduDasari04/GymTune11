/**
 * Dashboard.jsx — Top-level app shell after authentication.
 * Owns navigation state and renders the correct page component.
 */
import React, { useState } from "react";
import { Sidebar } from "../components/Sidebar.jsx";
import { OverviewPage }       from "./OverviewPage.jsx";
import { WorkoutPage }        from "./WorkoutPage.jsx";
import { HistoryPage }        from "./HistoryPage.jsx";
import { QuitPredictorPage }  from "./QuitPredictorPage.jsx";
import { NutritionPage }      from "./NutritionPage.jsx";
import { AnalyticsPage }      from "./AnalyticsPage.jsx";
import { ProfilePage }        from "./ProfilePage.jsx";

const PAGE_TITLES = {
  overview:  ["Overview",        "Last 30 days"],
  workouts:  ["Log Workout",     "Record your training session"],
  history:   ["Workout History", "Your last 50 sessions"],
  quit:      ["Quit Predictor",  "ML — Logistic Regression · 92.5% accuracy"],
  nutrition: ["Meal Planner",    "Protein foods & daily plan"],
  analytics: ["Analytics",       "Deep-dive into your metrics"],
  profile:   ["Profile",         "Account settings & lifetime stats"],
};

export function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState("overview");
  const [title, subtitle] = PAGE_TITLES[page] || ["GymTune", ""];

  const renderPage = () => {
    switch (page) {
      case "overview":  return <OverviewPage />;
      case "workouts":  return <WorkoutPage user={user} />;
      case "history":   return <HistoryPage />;
      case "quit":      return <QuitPredictorPage />;
      case "nutrition": return <NutritionPage user={user} />;
      case "analytics": return <AnalyticsPage />;
      case "profile":   return <ProfilePage user={user} onLogout={onLogout} />;
      default:          return <OverviewPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} activePage={page} onNavigate={setPage} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage("workouts")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                           font-semibold rounded-xl transition"
              >
                + Log Workout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-6 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
