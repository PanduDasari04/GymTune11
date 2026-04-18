"""
GymTune — Workouts Blueprint
Handles: log workout, history, weekly stats
"""
from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from datetime import datetime, timedelta
from app.models import get_db
from app.ml import calc_calories_met

workouts_bp = Blueprint("workouts", __name__)


def _require_login():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401
    return None


def _user_weight() -> float:
    db = get_db()
    row = db.execute("SELECT weight FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    return (row["weight"] or 70.0) if row else 70.0


def _update_streak(db, user_id: int):
    """Increment streak if yesterday had a workout, else reset to 1."""
    rows = db.execute(
        "SELECT DISTINCT workout_date FROM workouts WHERE user_id = ? ORDER BY workout_date DESC LIMIT 2",
        (user_id,),
    ).fetchall()
    if len(rows) < 2:
        db.execute("UPDATE users SET streak = 1 WHERE id = ?", (user_id,))
        return
    d1 = datetime.strptime(str(rows[0]["workout_date"]), "%Y-%m-%d")
    d2 = datetime.strptime(str(rows[1]["workout_date"]), "%Y-%m-%d")
    if (d1 - d2).days == 1:
        db.execute("UPDATE users SET streak = streak + 1 WHERE id = ?", (user_id,))
    elif (d1 - d2).days > 1:
        db.execute("UPDATE users SET streak = 1 WHERE id = ?", (user_id,))


# ── PAGE ─────────────────────────────────────

@workouts_bp.route("/workout")
def workout_page():
    if "user_id" not in session:
        return redirect(url_for("auth.index"))
    return render_template("workout.html")


# ── API ──────────────────────────────────────

@workouts_bp.route("/api/workouts/log", methods=["POST"])
def log_workout():
    err = _require_login()
    if err:
        return err

    data = request.get_json(force=True)
    if not data.get("activity_type") or not data.get("duration"):
        return jsonify(success=False, error="activity_type and duration are required"), 400

    user_id = session["user_id"]
    weight  = _user_weight()
    cal     = calc_calories_met(data["activity_type"], weight, float(data["duration"]))

    db = get_db()
    db.execute(
        """INSERT INTO workouts
           (user_id, activity_type, duration, calories_burned, distance, steps, speed, notes, workout_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user_id,
            data["activity_type"],
            int(data["duration"]),
            cal,
            data.get("distance") or None,
            data.get("steps") or None,
            data.get("speed") or None,
            data.get("notes") or "",
            data.get("date") or datetime.now().strftime("%Y-%m-%d"),
        ),
    )
    _update_streak(db, user_id)
    db.commit()
    return jsonify(success=True, calories_burned=cal)


@workouts_bp.route("/api/workouts/history")
def history():
    err = _require_login()
    if err:
        return err
    db  = get_db()
    rows = db.execute(
        "SELECT * FROM workouts WHERE user_id = ? ORDER BY workout_date DESC LIMIT 50",
        (session["user_id"],),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@workouts_bp.route("/api/workouts/weekly")
def weekly():
    err = _require_login()
    if err:
        return err
    db = get_db()
    rows = db.execute(
        """SELECT workout_date,
                  SUM(calories_burned) AS calories,
                  SUM(duration)        AS duration,
                  COUNT(*)             AS sessions,
                  SUM(steps)           AS steps
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-7 days')
           GROUP BY workout_date
           ORDER BY workout_date""",
        (session["user_id"],),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@workouts_bp.route("/api/workouts/<int:workout_id>", methods=["PUT"])
def edit_workout(workout_id):
    err = _require_login()
    if err:
        return err
    data    = request.get_json(force=True)
    user_id = session["user_id"]
    db      = get_db()

    # Verify ownership
    row = db.execute(
        "SELECT id FROM workouts WHERE id = ? AND user_id = ?", (workout_id, user_id)
    ).fetchone()
    if not row:
        return jsonify(success=False, error="Workout not found"), 404

    allowed = ("activity_type", "duration", "distance", "steps", "speed", "notes", "workout_date")
    updates = {k: data[k] for k in allowed if k in data}

    # Recalculate calories if activity or duration changed
    if "activity_type" in updates or "duration" in updates:
        cur = db.execute(
            "SELECT activity_type, duration FROM workouts WHERE id = ?", (workout_id,)
        ).fetchone()
        act = updates.get("activity_type", cur["activity_type"])
        dur = updates.get("duration",       cur["duration"])
        updates["calories_burned"] = calc_calories_met(act, _user_weight(), float(dur))

    if not updates:
        return jsonify(success=False, error="No fields to update"), 400

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(
        f"UPDATE workouts SET {set_clause} WHERE id = ? AND user_id = ?",
        (*updates.values(), workout_id, user_id),
    )
    db.commit()
    return jsonify(success=True)


@workouts_bp.route("/api/workouts/<int:workout_id>", methods=["DELETE"])
def delete_workout(workout_id):
    err = _require_login()
    if err:
        return err
    db = get_db()
    result = db.execute(
        "DELETE FROM workouts WHERE id = ? AND user_id = ?",
        (workout_id, session["user_id"]),
    )
    db.commit()
    if result.rowcount == 0:
        return jsonify(success=False, error="Workout not found"), 404
    return jsonify(success=True)


@workouts_bp.route("/api/workouts/daily-log", methods=["POST"])
def upsert_daily_log():
    """Save or update today's daily log (motivation, water, calories consumed)."""
    err = _require_login()
    if err:
        return err
    data = request.get_json(force=True)
    db   = get_db()
    db.execute(
        """INSERT INTO daily_logs
               (user_id, log_date, total_calories_consumed, water_intake, motivation_level)
           VALUES (?, DATE('now'), ?, ?, ?)
           ON CONFLICT(user_id, log_date) DO UPDATE SET
               total_calories_consumed = excluded.total_calories_consumed,
               water_intake            = excluded.water_intake,
               motivation_level        = excluded.motivation_level""",
        (
            session["user_id"],
            data.get("calories_consumed", 2000),
            data.get("water_intake",      0),
            data.get("motivation_level",  5),
        ),
    )
    db.commit()
    return jsonify(success=True)


@workouts_bp.route("/api/workouts/daily-log/today")
def get_today_log():
    err = _require_login()
    if err:
        return err
    db  = get_db()
    row = db.execute(
        "SELECT * FROM daily_logs WHERE user_id = ? AND log_date = DATE('now')",
        (session["user_id"],),
    ).fetchone()
    return jsonify(dict(row) if row else {})


@workouts_bp.route("/api/workouts/compare")
def compare_periods():
    """Compare last 7 days vs previous 7 days."""
    err = _require_login()
    if err:
        return err
    db  = get_db()
    uid = session["user_id"]

    def period_stats(days_ago_start, days_ago_end):
        return db.execute(
            """SELECT
                   COALESCE(SUM(calories_burned),0) AS calories,
                   COALESCE(SUM(duration),0)         AS minutes,
                   COUNT(*)                           AS sessions,
                   COALESCE(SUM(steps),0)             AS steps
               FROM workouts
               WHERE user_id = ?
               AND workout_date >= DATE('now', ? || ' days')
               AND workout_date <  DATE('now', ? || ' days')""",
            (uid, f"-{days_ago_start}", f"-{days_ago_end}"),
        ).fetchone()

    this  = dict(period_stats(7,  0))
    prev  = dict(period_stats(14, 7))

    def pct_change(new, old):
        if old == 0:
            return 100 if new > 0 else 0
        return round((new - old) / old * 100, 1)

    return jsonify(
        this_week=this,
        prev_week=prev,
        changes={
            "calories": pct_change(this["calories"], prev["calories"]),
            "minutes":  pct_change(this["minutes"],  prev["minutes"]),
            "sessions": pct_change(this["sessions"], prev["sessions"]),
            "steps":    pct_change(this["steps"],    prev["steps"]),
        },
    )


@workouts_bp.route("/api/workouts/seed-demo", methods=["POST"])
def seed_demo():
    """Populate 25 days of demo data for the current user."""
    err = _require_login()
    if err:
        return err
    import random
    user_id = session["user_id"]
    weight  = _user_weight()
    db      = get_db()
    acts    = ["running", "gym_strength", "cycling", "walking", "hiit", "yoga"]

    for i in range(25):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        if random.random() > 0.25:
            act = random.choice(acts)
            dur = random.randint(20, 70)
            cal = calc_calories_met(act, weight, dur)
            db.execute(
                """INSERT OR IGNORE INTO workouts
                   (user_id, activity_type, duration, calories_burned, steps, speed, workout_date)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id, act, dur, cal,
                    random.randint(3000, 12000),
                    round(random.uniform(5, 12), 1),
                    date,
                ),
            )
    db.commit()
    return jsonify(success=True, message="Demo data loaded!")
