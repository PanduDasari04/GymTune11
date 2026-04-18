"""
GymTune v2 — Profile Blueprint
Handles: view/update profile, Tableau-optimized BI CSV export, streak history, delete account.
"""
import csv
import io
import math
from datetime import datetime, timedelta

from flask import (
    Blueprint, request, jsonify, session,
    render_template, redirect, url_for, Response,
)
from app.models import get_db, hash_password, verify_password
from app.ml import MET_VALUES

profile_bp = Blueprint("profile", __name__)


def _require_login():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401
    return None


# ─────────────────────────────────────────────────────────────
# PAGE
# ─────────────────────────────────────────────────────────────

@profile_bp.route("/profile")
def profile_page():
    if "user_id" not in session:
        return redirect(url_for("auth.index"))
    return render_template("profile.html")


# ─────────────────────────────────────────────────────────────
# GET PROFILE
# ─────────────────────────────────────────────────────────────

@profile_bp.route("/api/profile")
def get_profile():
    err = _require_login()
    if err:
        return err
    db = get_db()
    user = db.execute(
        "SELECT id, username, email, age, weight, height, goal, streak, created_at "
        "FROM users WHERE id = ?",
        (session["user_id"],),
    ).fetchone()
    if not user:
        return jsonify(error="User not found"), 404

    stats = db.execute(
        """SELECT
               COUNT(*)                           AS total_sessions,
               COALESCE(SUM(calories_burned), 0)  AS total_calories,
               COALESCE(SUM(duration), 0)          AS total_minutes,
               COALESCE(SUM(steps), 0)             AS total_steps,
               COALESCE(SUM(distance), 0)          AS total_distance,
               MIN(workout_date)                   AS first_workout,
               MAX(workout_date)                   AS last_workout
           FROM workouts WHERE user_id = ?""",
        (session["user_id"],),
    ).fetchone()

    all_dates = db.execute(
        "SELECT DISTINCT workout_date FROM workouts WHERE user_id = ? ORDER BY workout_date",
        (session["user_id"],),
    ).fetchall()

    return jsonify(
        user=dict(user),
        lifetime=dict(stats),
        total_workout_days=len(all_dates),
    )


# ─────────────────────────────────────────────────────────────
# UPDATE PROFILE
# ─────────────────────────────────────────────────────────────

@profile_bp.route("/api/profile/update", methods=["POST"])
def update_profile():
    err = _require_login()
    if err:
        return err
    data = request.get_json(force=True)
    db   = get_db()

    allowed = ("age", "weight", "height", "goal")
    updates = {k: data[k] for k in allowed if k in data and data[k] is not None}

    if data.get("new_password"):
        if not data.get("current_password"):
            return jsonify(success=False, error="Current password required"), 400
        user = db.execute(
            "SELECT password FROM users WHERE id = ?", (session["user_id"],)
        ).fetchone()
        if not verify_password(data["current_password"], user["password"]):
            return jsonify(success=False, error="Current password is incorrect"), 400
        updates["password"] = hash_password(data["new_password"])

    if not updates:
        return jsonify(success=False, error="No fields to update"), 400

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(
        f"UPDATE users SET {set_clause} WHERE id = ?",
        (*updates.values(), session["user_id"]),
    )
    db.commit()
    return jsonify(success=True, message="Profile updated")


# ─────────────────────────────────────────────────────────────
# TABLEAU-OPTIMISED BI CSV EXPORT
# ─────────────────────────────────────────────────────────────

def _rolling_consistency(workout_dates, target_date, window: int = 30) -> float:
    """
    Calculate the rolling consistency score (%) for the <window> days ending on target_date.
    workout_dates must be a sorted list of ISO date strings.
    """
    td = datetime.strptime(str(target_date), "%Y-%m-%d")
    start = td - timedelta(days=window - 1)
    active = sum(
        1 for d in workout_dates
        if start <= datetime.strptime(str(d), "%Y-%m-%d") <= td
    )
    return round((active / window) * 100, 2)


def _iso_week(date_str) -> str:
    """Return ISO year-week string, e.g. '2024-W03'. Accepts str or datetime.date."""
    dt = datetime.strptime(str(date_str), "%Y-%m-%d")
    return dt.strftime("%G-W%V")


def _iso_month(date_str: str) -> str:
    return date_str[:7]  # 'YYYY-MM'


@profile_bp.route("/api/profile/export-csv")
def export_csv():
    """
    Export a Tableau/Power BI-ready CSV with pre-calculated analytical fields.

    Schema (one row per workout session):
      Dimension columns:
        workout_date, year, month, iso_week, day_of_week, day_name,
        activity_type, activity_category, goal

      Raw measure columns:
        duration_min, calories_burned, distance_km, steps, speed_kmh,
        user_weight_kg, user_age, user_height_cm

      Calculated / derived columns (ready for Tableau without transforms):
        met_value                   - MET for this activity
        calories_per_minute         - calories_burned / duration_min
        fat_loss_grams              - calories_burned / 7.7  (7700 kcal = 1 kg)
        pace_min_per_km             - 60 / speed_kmh  (NULL if no speed)
        bmi                         - weight_kg / (height_m)^2
        weekly_volume_minutes       - SUM(duration) for the ISO week this row belongs to
        weekly_volume_calories      - SUM(calories) for the ISO week this row belongs to
        weekly_session_count        - COUNT of sessions in the ISO week
        calorie_deficit_vs_2000     - calories_burned - 2000 (daily maintenance baseline)
        rolling_30d_consistency_pct - % of last 30 days that had ≥1 workout
        cumulative_calories_to_date - running total of calories burned (chronological)
        cumulative_sessions_to_date - running total of sessions (chronological)
    """
    err = _require_login()
    if err:
        return err

    uid = session["user_id"]
    db  = get_db()

    # ── Fetch user profile ─────────────────────────────
    user = db.execute(
        "SELECT weight, height, age, goal FROM users WHERE id = ?", (uid,)
    ).fetchone()
    weight_kg  = float(user["weight"] or 70)
    height_cm  = float(user["height"] or 175)
    age        = int(user["age"]    or 25)
    goal       = user["goal"] or "general_fitness"
    height_m   = height_cm / 100
    bmi        = round(weight_kg / (height_m ** 2), 2) if height_m > 0 else None

    # ── Fetch all workouts ordered chronologically ─────
    rows = db.execute(
        """SELECT workout_date, activity_type, duration, calories_burned,
                  distance, steps, speed, notes
           FROM workouts WHERE user_id = ?
           ORDER BY workout_date ASC, id ASC""",
        (uid,),
    ).fetchall()

    if not rows:
        return Response(
            "workout_date\n",
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=gymtune_empty.csv"},
        )

    # ── Activity category mapping ──────────────────────
    CATEGORY = {
        "running":      "Cardio",
        "jogging":      "Cardio",
        "walking":      "Cardio",
        "cycling":      "Cardio",
        "swimming":     "Cardio",
        "jump_rope":    "Cardio",
        "elliptical":   "Cardio",
        "hiit":         "HIIT",
        "gym_strength": "Strength",
        "yoga":         "Flexibility",
        "resting":      "Recovery",
    }

    DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # ── Pre-compute weekly aggregates ─────────────────
    week_volume_min: dict[str, float] = {}
    week_volume_cal: dict[str, float] = {}
    week_sessions:   dict[str, int]   = {}
    all_dates = sorted(set(r["workout_date"] for r in rows))

    for r in rows:
        wk = _iso_week(r["workout_date"])
        week_volume_min[wk] = week_volume_min.get(wk, 0) + (r["duration"] or 0)
        week_volume_cal[wk] = week_volume_cal.get(wk, 0) + float(r["calories_burned"] or 0)
        week_sessions[wk]   = week_sessions.get(wk, 0) + 1

    # ── CSV header ─────────────────────────────────────
    HEADERS = [
        # Dimensions
        "workout_date", "year", "month", "iso_week", "day_of_week", "day_name",
        "activity_type", "activity_category", "goal",
        # Raw measures
        "duration_min", "calories_burned", "distance_km", "steps", "speed_kmh",
        "user_weight_kg", "user_age", "user_height_cm",
        # Derived / calculated fields
        "met_value", "calories_per_minute", "fat_loss_grams",
        "pace_min_per_km", "bmi",
        "weekly_volume_minutes", "weekly_volume_calories", "weekly_session_count",
        "calorie_deficit_vs_2000",
        "rolling_30d_consistency_pct",
        "cumulative_calories_to_date", "cumulative_sessions_to_date",
    ]

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(HEADERS)

    cumulative_calories = 0.0
    cumulative_sessions = 0

    for r in rows:
        date_str      = str(r["workout_date"])
        activity      = r["activity_type"] or "unknown"
        duration      = int(r["duration"] or 0)
        calories      = round(float(r["calories_burned"] or 0), 2)
        distance      = round(float(r["distance"] or 0), 3) if r["distance"] else ""
        steps         = int(r["steps"])  if r["steps"]  else ""
        speed         = round(float(r["speed"]), 2)   if r["speed"]   else ""

        dt        = datetime.strptime(date_str, "%Y-%m-%d")
        year      = dt.year
        month     = _iso_month(date_str)
        iso_week  = _iso_week(date_str)
        dow       = dt.weekday()          # 0=Monday … 6=Sunday
        day_name  = DAY_NAMES[dow]

        met       = MET_VALUES.get(activity, 5.0)
        cal_pm    = round(calories / duration, 3) if duration > 0 else ""
        fat_g     = round(calories / 7.7, 3)       # grams (7700 kcal = 1 kg)
        pace      = round(60 / float(speed), 2) if speed != "" and float(speed) > 0 else ""

        wk = iso_week
        wv_min  = round(week_volume_min.get(wk, 0), 1)
        wv_cal  = round(week_volume_cal.get(wk, 0), 2)
        wv_sess = week_sessions.get(wk, 0)

        cal_deficit = round(calories - 2000, 2)

        rolling = _rolling_consistency(all_dates, date_str, window=30)

        cumulative_calories += calories
        cumulative_sessions += 1

        writer.writerow([
            # Dimensions
            date_str, year, month, iso_week, dow + 1, day_name,
            activity, CATEGORY.get(activity, "Other"), goal,
            # Raw measures
            duration, calories, distance, steps, speed,
            weight_kg, age, height_cm,
            # Derived
            met,
            cal_pm,
            fat_g,
            pace,
            bmi,
            wv_min,
            round(wv_cal, 2),
            wv_sess,
            cal_deficit,
            rolling,
            round(cumulative_calories, 2),
            cumulative_sessions,
        ])

    output.seek(0)
    filename = f"gymtune_bi_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─────────────────────────────────────────────────────────────
# STREAK HISTORY
# ─────────────────────────────────────────────────────────────

@profile_bp.route("/api/profile/streak-history")
def streak_history():
    err = _require_login()
    if err:
        return err
    db   = get_db()
    rows = db.execute(
        """SELECT workout_date, COUNT(*) AS sessions, SUM(calories_burned) AS calories
           FROM workouts WHERE user_id = ?
           AND workout_date >= DATE('now', '-60 days')
           GROUP BY workout_date ORDER BY workout_date""",
        (session["user_id"],),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────────────────────
# DELETE ACCOUNT
# ─────────────────────────────────────────────────────────────

@profile_bp.route("/api/profile/delete", methods=["POST"])
def delete_account():
    err = _require_login()
    if err:
        return err
    data = request.get_json(force=True)
    db   = get_db()
    user = db.execute(
        "SELECT password FROM users WHERE id = ?", (session["user_id"],)
    ).fetchone()
    if not user or not verify_password(data.get("password", ""), user["password"]):
        return jsonify(success=False, error="Incorrect password"), 400
    db.execute("DELETE FROM workouts         WHERE user_id = ?", (session["user_id"],))
    db.execute("DELETE FROM quit_predictions WHERE user_id = ?", (session["user_id"],))
    db.execute("DELETE FROM daily_logs       WHERE user_id = ?", (session["user_id"],))
    db.execute("DELETE FROM users            WHERE id      = ?", (session["user_id"],))
    db.commit()
    session.clear()
    return jsonify(success=True)
