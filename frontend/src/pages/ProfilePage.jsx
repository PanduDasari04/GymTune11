import React, { useState } from "react";
import { useFetch } from "../hooks/useFetch.js";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { Spinner } from "../components/Spinner.jsx";

function StatItem({ label, value, color = "text-gray-800" }) {
  return (
    <div className="text-center bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1.5">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function EditField({ label, id, type="number", value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
    </div>
  );
}

function Heatmap({ data = [] }) {
  const dateMap = {};
  data.forEach(r => { dateMap[r.workout_date?.slice(0,10) || r.workout_date] = r.calories || 0; });
  const maxCal = Math.max(...Object.values(dateMap), 1);

  const days = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (59 - i));
    const key = d.toISOString().split("T")[0];
    const cal = dateMap[key] || 0;
    const level = cal === 0 ? 0 : cal < maxCal*0.25 ? 1 : cal < maxCal*0.5 ? 2 : cal < maxCal*0.75 ? 3 : 4;
    return { key, cal, level };
  });

  const BG = ["bg-gray-100", "bg-blue-100", "bg-blue-300", "bg-blue-500", "bg-blue-700"];

  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
        {days.map(d => (
          <div key={d.key} title={`${d.key}: ${Math.round(d.cal)} kcal`}
            className={`aspect-square rounded-sm ${BG[d.level]} cursor-default hover:ring-1 hover:ring-blue-400 transition`} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 justify-end">
        <span className="text-xs text-gray-400">Less</span>
        {BG.map((b,i) => <div key={i} className={`w-3 h-3 rounded-sm ${b}`} />)}
        <span className="text-xs text-gray-400">More</span>
      </div>
    </div>
  );
}

export function ProfilePage({ user, onLogout }) {
  const { data: profileData, loading, refetch } = useFetch("/api/profile");
  const { data: heatmapData } = useFetch("/api/profile/streak-history");

  const [age,     setAge]     = useState(user?.age     || "");
  const [weight,  setWeight]  = useState(user?.weight  || "");
  const [height,  setHeight]  = useState(user?.height  || "");
  const [goal,    setGoal]    = useState(user?.goal    || "general_fitness");
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [curPw,  setCurPw]  = useState(""); const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState(""); const [pwMsg,  setPwMsg]  = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [delPw,   setDelPw]   = useState(""); const [delMsg, setDelMsg] = useState("");

  const goals = [
    ["general_fitness","🏃 General Fitness"],["muscle_gain","💪 Muscle Gain"],
    ["fat_loss","🔥 Fat Loss"],["endurance","🚴 Endurance"],
  ];

  const saveProfile = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post("/api/profile/update", {
        age: age ? +age : null, weight: weight ? +weight : null,
        height: height ? +height : null, goal,
      });
      setSaveMsg("✓ Profile updated");
      refetch();
    } catch (e) { setSaveMsg("✕ " + e.message); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!curPw || !newPw) { setPwMsg("✕ Fill all fields"); return; }
    if (newPw.length < 6) { setPwMsg("✕ Min 6 characters"); return; }
    if (newPw !== confPw) { setPwMsg("✕ Passwords do not match"); return; }
    setPwSaving(true); setPwMsg("");
    try {
      await api.post("/api/profile/update", { current_password: curPw, new_password: newPw });
      setPwMsg("✓ Password changed"); setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e) { setPwMsg("✕ " + e.message); }
    finally { setPwSaving(false); }
  };

  const deleteAccount = async () => {
    if (!delPw) { setDelMsg("✕ Enter password"); return; }
    if (!confirm("Permanently delete your account and all data?")) return;
    try {
      await api.post("/api/profile/delete", { password: delPw });
      onLogout();
    } catch (e) { setDelMsg("✕ " + e.message); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const lt = profileData?.lifetime || {};
  const bmi = user?.weight && user?.height
    ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-400 mt-0.5">Account settings & lifetime stats</p>
      </div>

      {/* Hero */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold
                          flex items-center justify-center flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-900">{user?.username}</p>
            <p className="text-sm text-gray-400">{profileData?.user?.email}</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-medium">
                {goal.replace("_"," ")}
              </span>
              <span className="text-xs text-orange-500 font-semibold">
                🔥 {user?.streak || 0} day streak
              </span>
              {profileData?.user?.created_at && (
                <span className="text-xs text-gray-400">
                  Member since {profileData.user.created_at.slice(0,10)}
                </span>
              )}
            </div>
          </div>
          <a href="/api/profile/export-csv"
            className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm
                       font-medium rounded-xl transition flex items-center gap-2 flex-shrink-0">
            ↓ Export CSV
          </a>
        </div>
      </Card>

      {/* Lifetime stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatItem label="Sessions"    value={(lt.total_sessions || 0).toLocaleString()} color="text-blue-600" />
        <StatItem label="Calories"    value={Math.round(lt.total_calories || 0).toLocaleString()} color="text-amber-600" />
        <StatItem label="Minutes"     value={(lt.total_minutes  || 0).toLocaleString()} color="text-purple-600" />
        <StatItem label="BMI"         value={bmi ?? "—"} color="text-green-600" />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader title="Activity Heatmap" subtitle="Last 60 days" />
        <Heatmap data={heatmapData || []} />
      </Card>

      {/* Edit profile + change password */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Edit Profile" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Age"          id="p-age"    value={age}    onChange={e => setAge(e.target.value)}    placeholder="25" />
              <EditField label="Weight (kg)"  id="p-weight" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" />
              <EditField label="Height (cm)"  id="p-height" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Goal</label>
                <select value={goal} onChange={e => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {goals.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            {saveMsg && (
              <p className={`text-sm font-medium ${saveMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {saveMsg}
              </p>
            )}
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white
                         font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2">
              {saving && <Spinner size="sm" />} Save Changes
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Change Password" />
          <div className="space-y-3">
            {[["Current", curPw, setCurPw],["New Password", newPw, setNewPw],["Confirm New", confPw, setConfPw]]
              .map(([lbl, val, fn]) => (
              <div key={lbl}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{lbl}</label>
                <input type="password" value={val} onChange={e => fn(e.target.value)} placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-sm font-medium ${pwMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {pwMsg}
              </p>
            )}
            <button onClick={changePassword} disabled={pwSaving}
              className="w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50
                         font-medium rounded-xl text-sm transition flex items-center justify-center gap-2">
              {pwSaving && <Spinner size="sm" />} Update Password
            </button>
          </div>
        </Card>
      </div>

      {/* Danger zone */}
      <Card>
        <p className="text-sm font-bold text-red-600 mb-1">Danger Zone</p>
        <p className="text-xs text-gray-400 mb-4">
          Permanently delete your account and all workout data. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="password" value={delPw} onChange={e => setDelPw(e.target.value)}
            placeholder="Enter password to confirm"
            className="px-3.5 py-2.5 rounded-xl border border-red-200 text-sm w-64
                       focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
          <button onClick={deleteAccount}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200
                       font-semibold rounded-xl text-sm transition">
            Delete Account
          </button>
          {delMsg && <p className="text-sm text-red-500 font-medium">{delMsg}</p>}
        </div>
      </Card>
    </div>
  );
}
