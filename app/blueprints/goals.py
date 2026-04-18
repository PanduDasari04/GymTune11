"""
GymTune v2 — Goals & Achievements Blueprint
Handles: set/update goals, check achievements, badge system
"""
from flask import Blueprint, request, jsonify, session
from app.models import get_db

goals_bp = Blueprint("goals", __name__)

# ── ACHIEVEMENT DEFINITIONS ───────────────────
ACHIEVEMENTS = [
    {"id": "first_workout",   "icon": "🏁", "title": "First Step",       "desc": "Log your first workout",              "type": "sessions",  "threshold": 1},
    {"id": "week_warrior",    "icon": "⚔️", "title": "Week Warrior",      "desc": "Log 5 workouts in one week",          "type": "sessions",  "threshold": 5},
    {"id": "ten_sessions",    "icon": "🔟", "title": "Perfect Ten",        "desc": "Complete 10 total sessions",          "type": "sessions",  "threshold": 10},
    {"id": "fifty_sessions",  "icon": "🥈", "title": "Half Century",       "desc": "Complete 50 total sessions",          "type": "sessions",  "threshold": 50},
    {"id": "century",         "icon": "💯", "title": "Century Club",       "desc": "Complete 100 total sessions",         "type": "sessions",  "threshold": 100},
    {"id": "streak_7",        "icon": "🔥", "title": "On Fire",            "desc": "Maintain a 7-day streak",             "type": "streak",    "threshold": 7},
    {"id": "streak_30",       "icon": "🌟", "title": "Monthly Master",     "desc": "Maintain a 30-day streak",            "type": "streak",    "threshold": 30},
    {"id": "cal_10k",         "icon": "⚡", "title": "Burner",             "desc": "Burn 10,000 total calories",          "type": "calories",  "threshold": 10000},
    {"id": "cal_50k",         "icon": "🔆", "title": "Calorie Crusher",    "desc": "Burn 50,000 total calories",          "type": "calories",  "threshold": 50000},
    {"id": "steps_100k",      "icon": "👣", "title": "Step Master",        "desc": "Log 100,000 total steps",             "type": "steps",     "threshold": 100000},
    {"id": "runner",          "icon": "🏃", "title": "Runner",             "desc": "Log 10 running sessions",             "type": "activity",  "threshold": 10, "activity": "running"},
    {"id": "lifter",          "icon": "🏋️", "title": "Iron Lifter",        "desc": "Log 10 strength sessions",            "type": "activity",  "threshold": 10, "activity": "gym_strength"},
    {"id": "hour_grind",      "icon": "⏱️", "title": "Hour Grind",         "desc": "Log a single session of 60+ minutes", "type": "duration",  "threshold": 60},
    {"id": "consistency_50",  "icon": "📈", "title": "Consistent",         "desc": "Reach 50% consistency score",         "type": "consist",   "threshold": 50},
    {"id": "consistency_80",  "icon": "🎯", "title": "Dedicated",          "desc": "Reach 80% consistency score",         "type": "consist",   "threshold": 80},
]


def _require_login():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401
    return None


def _compute_achievements(uid: int, db) -> list:
    """Return list of achievements with unlocked=True/False."""
    stats = db.execute(
        """SELECT
               COUNT(*)                            AS total_sessions,
               COALESCE(SUM(calories_burned),0)    AS total_calories,
               COALESCE(SUM(steps),0)              AS total_steps,
               MAX(duration)                       AS max_duration
           FROM workouts WHERE user_id = ?""",
        (uid,),
    ).fetchone()

    streak_row = db.execute(
        "SELECT streak FROM users WHERE id = ?", (uid,)
    ).fetchone()

    # Consistency: active days / 30
    active_row = db.execute(
        """SELECT COUNT(DISTINCT workout_date) AS active
           FROM workouts WHERE user_id = ? AND workout_date >= DATE('now','-30 days')""",
        (uid,),
    ).fetchone()
    consistency = (active_row["active"] / 30) * 100

    # Activity-specific counts
    act_counts = {}
    for row in db.execute(
        "SELECT activity_type, COUNT(*) AS cnt FROM workouts WHERE user_id = ? GROUP BY activity_type",
        (uid,),
    ).fetchall():
        act_counts[row["activity_type"]] = row["cnt"]

    results = []
    for a in ACHIEVEMENTS:
        unlocked = False
        atype = a["type"]

        if atype == "sessions":
            unlocked = (stats["total_sessions"] or 0) >= a["threshold"]
        elif atype == "streak":
            unlocked = (streak_row["streak"] or 0) >= a["threshold"]
        elif atype == "calories":
            unlocked = (stats["total_calories"] or 0) >= a["threshold"]
        elif atype == "steps":
            unlocked = (stats["total_steps"] or 0) >= a["threshold"]
        elif atype == "activity":
            unlocked = act_counts.get(a.get("activity", ""), 0) >= a["threshold"]
        elif atype == "duration":
            unlocked = (stats["max_duration"] or 0) >= a["threshold"]
        elif atype == "consist":
            unlocked = consistency >= a["threshold"]

        results.append({**a, "unlocked": unlocked})

    return results


# ── ACHIEVEMENTS ──────────────────────────────

@goals_bp.route("/api/goals/achievements")
def achievements():
    err = _require_login()
    if err:
        return err
    db   = get_db()
    uid  = session["user_id"]
    data = _compute_achievements(uid, db)
    unlocked_count = sum(1 for a in data if a["unlocked"])
    return jsonify(achievements=data, unlocked=unlocked_count, total=len(data))


# ── WEEKLY GOALS ──────────────────────────────

@goals_bp.route("/api/goals/weekly")
def get_weekly_goals():
    err = _require_login()
    if err:
        return err
    db  = get_db()
    uid = session["user_id"]

    # Fetch user's custom targets (stored in users table extensions)
    # For now use defaults + compute actuals
    actuals = db.execute(
        """SELECT
               COALESCE(SUM(calories_burned),0) AS calories,
               COUNT(*)                          AS sessions,
               COALESCE(SUM(steps),0)            AS steps,
               COALESCE(SUM(duration),0)         AS minutes
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now','-7 days')""",
        (uid,),
    ).fetchone()

    targets = {"calories": 3500, "sessions": 5, "steps": 50000, "minutes": 200}
    actuals_d = dict(actuals)

    return jsonify(
        targets=targets,
        actuals={k: round(v, 1) for k, v in actuals_d.items()},
        progress={
            k: round(min(actuals_d[k] / targets[k] * 100, 100), 1)
            for k in targets
        },
    )


# ── MONTHLY SUMMARY ───────────────────────────

@goals_bp.route("/api/goals/monthly-summary")
def monthly_summary():
    err = _require_login()
    if err:
        return err
    db  = get_db()
    uid = session["user_id"]

    rows = db.execute(
        """SELECT
               strftime('%Y-%m', workout_date)    AS month,
               COUNT(*)                           AS sessions,
               ROUND(SUM(calories_burned),0)      AS calories,
               SUM(duration)                      AS minutes
           FROM workouts WHERE user_id = ?
           GROUP BY month ORDER BY month DESC LIMIT 6""",
        (uid,),
    ).fetchall()

    return jsonify([dict(r) for r in rows])
