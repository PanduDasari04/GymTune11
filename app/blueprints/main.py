"""
GymTune — Main Blueprint
Handles:
  - /app  → React SPA shell (spa.html)
  - Legacy page routes kept for backwards-compat, redirect to /app
  - /api/dashboard/summary  → JSON API consumed by React
"""
from flask import Blueprint, jsonify, session, render_template, redirect, url_for
from app.models import get_db
from app.ml import calc_bmi

main_bp = Blueprint("main", __name__)


# ── React SPA entry-point ──────────────────────────────────────
@main_bp.route("/app")
@main_bp.route("/app/")
def spa():
    """Serve the React SPA shell for all non-API routes."""
    return render_template("spa.html")


# ── Legacy HTML routes → redirect to React SPA ────────────────
@main_bp.route("/dashboard")
def dashboard():
    return redirect(url_for("main.spa"))


@main_bp.route("/nutrition")
def nutrition_page():
    return redirect(url_for("main.spa"))


@main_bp.route("/workout")
def workout_page():
    return redirect(url_for("main.spa"))


@main_bp.route("/analytics")
def analytics_page():
    return redirect(url_for("main.spa"))


@main_bp.route("/profile")
def profile_page_redirect():
    return redirect(url_for("main.spa"))


# ── Dashboard summary API ──────────────────────────────────────
@main_bp.route("/api/dashboard/summary")
def summary():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401

    uid = session["user_id"]
    db  = get_db()

    user = db.execute(
        "SELECT username, age, weight, height, goal, streak FROM users WHERE id = ?",
        (uid,),
    ).fetchone()

    if not user:
        return jsonify(error="User not found"), 404

    stats = db.execute(
        """SELECT
               COALESCE(SUM(calories_burned), 0) AS total_calories,
               COALESCE(SUM(duration), 0)         AS total_minutes,
               COUNT(*)                            AS total_sessions,
               COALESCE(SUM(steps), 0)             AS total_steps
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-30 days')""",
        (uid,),
    ).fetchone()

    activities = db.execute(
        """SELECT activity_type, COUNT(*) AS cnt
           FROM workouts WHERE user_id = ?
           GROUP BY activity_type
           ORDER BY cnt DESC""",
        (uid,),
    ).fetchall()

    weekly = db.execute(
        """SELECT workout_date,
                  SUM(calories_burned) AS cal,
                  SUM(duration)        AS dur,
                  COUNT(*)             AS sessions
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-7 days')
           GROUP BY workout_date ORDER BY workout_date""",
        (uid,),
    ).fetchall()

    active_days = db.execute(
        """SELECT COUNT(DISTINCT workout_date) AS cnt
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-30 days')""",
        (uid,),
    ).fetchone()

    consistency = round((int(active_days["cnt"] or 0) / 30) * 100, 1)

    bmi_data = None
    if user["weight"] and user["height"]:
        bmi_data = calc_bmi(float(user["weight"]), float(user["height"]))

    return jsonify(
        user=dict(user),
        stats=dict(stats),
        activities=[dict(r) for r in activities],
        weekly_data=[dict(r) for r in weekly],
        consistency_score=consistency,
        bmi=bmi_data,
    )
