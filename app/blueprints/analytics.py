"""
GymTune — Analytics Blueprint
Handles: BMI, calories, fat-loss projection, running benchmarks, activity detection
"""
from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from app.models import get_db
from app.ml import (
    calc_bmi, calc_calories_met, detect_activity,
    running_benchmark, MET_VALUES, RUNNING_BENCHMARKS,
)

analytics_bp = Blueprint("analytics", __name__)


def _require_login():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401
    return None


# ── PAGES ─────────────────────────────────────

@analytics_bp.route("/analytics")
def analytics_page():
    if "user_id" not in session:
        return redirect(url_for("auth.index"))
    return render_template("analytics.html")


# ── BMI ───────────────────────────────────────

@analytics_bp.route("/api/analytics/bmi", methods=["POST"])
def bmi():
    d = request.get_json(force=True)
    weight = float(d.get("weight", 0))
    height = float(d.get("height", 0))
    if weight <= 0 or height <= 0:
        return jsonify(error="Invalid weight or height"), 400
    return jsonify(calc_bmi(weight, height))


# ── CALORIES ─────────────────────────────────

@analytics_bp.route("/api/analytics/calories", methods=["POST"])
def calories():
    d = request.get_json(force=True)
    cal = calc_calories_met(
        str(d.get("activity", "running")),
        float(d.get("weight", 70)),
        float(d.get("duration", 30)),
    )
    fat_g = round(cal / 7700 * 1000, 2)
    return jsonify(calories=cal, fat_loss_grams=fat_g)


# ── FAT LOSS PROJECTION ──────────────────────

@analytics_bp.route("/api/analytics/fat-loss")
def fat_loss():
    err = _require_login()
    if err:
        return err
    db = get_db()
    rows = db.execute(
        """SELECT workout_date, SUM(calories_burned) AS burned
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-7 days')
           GROUP BY workout_date ORDER BY workout_date""",
        (session["user_id"],),
    ).fetchall()

    total_burned  = sum(r["burned"] for r in rows)
    avg_consumed  = 2000 * max(len(rows), 1)
    deficit       = total_burned - avg_consumed
    fat_loss_kg   = round(max(deficit, 0) / 7700, 3)

    return jsonify(
        total_burned=round(total_burned, 1),
        estimated_consumed=avg_consumed,
        calorie_deficit=round(deficit, 1),
        weekly_fat_loss_kg=fat_loss_kg,
        days_tracked=len(rows),
    )


# ── RUNNING BENCHMARK ────────────────────────

@analytics_bp.route("/api/analytics/running", methods=["POST"])
def running():
    d = request.get_json(force=True)
    age   = int(d.get("age", 25))
    speed = float(d.get("speed", 0))
    if speed <= 0:
        return jsonify(error="Speed must be > 0"), 400
    return jsonify(running_benchmark(age, speed))


# ── ACTIVITY DETECT ──────────────────────────

@analytics_bp.route("/api/analytics/detect-activity", methods=["POST"])
def detect():
    d = request.get_json(force=True)
    return jsonify(detect_activity(
        float(d.get("speed", 0)),
        float(d.get("steps_per_min", 0)),
    ))


# ── MET REFERENCE ────────────────────────────

@analytics_bp.route("/api/analytics/met-values")
def met_values():
    return jsonify(MET_VALUES)


# ── RUNNING BENCHMARKS TABLE ─────────────────

@analytics_bp.route("/api/analytics/running-benchmarks")
def running_benchmarks():
    return jsonify(RUNNING_BENCHMARKS)
