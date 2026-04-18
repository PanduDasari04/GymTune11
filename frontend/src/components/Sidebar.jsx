import React from "react";

const NAV = [
  { id: "overview",  icon: "⬛", label: "Overview" },
  { id: "workouts",  icon: "🏋️", label: "Log Workout" },
  { id: "history",   icon: "📋", label: "History" },
  { id: "quit",      icon: "🤖", label: "Quit Predictor" },
  { id: "nutrition", icon: "🥗", label: "Nutrition" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "profile",   icon: "👤", label: "Profile" },
];

export function Sidebar({ user, activePage, onNavigate, onLogout }) {
  const initial = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="text-xl font-bold tracking-tight text-gray-900">
          Gym<span className="text-blue-600">Tune</span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5 font-medium">AI Fitness Intelligence</div>
      </div>

      {/* User chip */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.username}</p>
            <p className="text-xs text-orange-500 font-medium">🔥 {user?.streak || 0} day streak</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(({ id, icon, label }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left
                ${active
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full text-sm text-gray-400 hover:text-red-500 font-medium py-2 transition-colors text-left px-2"
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  );
}
