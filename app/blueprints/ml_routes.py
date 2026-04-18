"""
GymTune — ML Blueprint
Handles: quit prediction, model training endpoint, nutrition plan
"""
from flask import Blueprint, request, jsonify, session, current_app
from app.models import get_db
from app.ml import predict_quit, nutrition_plan, train_model

ml_bp = Blueprint("ml", __name__)


def _require_login():
    if "user_id" not in session:
        return jsonify(error="Unauthorised"), 401
    return None


def _consistency_score(user_id: int) -> float:
    """Calculate % of last 30 days that had at least one workout."""
    db = get_db()
    row = db.execute(
        """SELECT COUNT(DISTINCT workout_date) AS active
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-30 days')""",
        (user_id,),
    ).fetchone()
    return round((row["active"] / 30) * 100, 1) if row else 0.0


# ── QUIT PREDICTION ──────────────────────────

@ml_bp.route("/api/ml/predict-quit", methods=["POST"])
def predict():
    d = request.get_json(force=True)
    user_id = session.get("user_id")

    freq    = float(d.get("workout_frequency", 3))
    missed  = int(d.get("missed_days", 5))
    motiv   = int(d.get("motivation_level", 5))
    consist = float(d.get("consistency_score", 60))

    result = predict_quit(
        freq, missed, motiv, consist,
        current_app.config["ML_MODEL_PATH"],
    )

    # Persist prediction
    if user_id:
        db = get_db()
        db.execute(
            """INSERT INTO quit_predictions
               (user_id, quit_probability, risk_level,
                workout_frequency, missed_days, motivation_level, consistency_score)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, result["quit_probability"], result["risk_level"],
             freq, missed, motiv, consist),
        )
        db.commit()

    return jsonify(result)


# ── AUTO PREDICT (uses real user data) ───────

@ml_bp.route("/api/ml/auto-predict")
def auto_predict():
    err = _require_login()
    if err:
        return err
    user_id = session["user_id"]
    db = get_db()

    # Calculate inputs from real data
    freq_row = db.execute(
        """SELECT COUNT(DISTINCT workout_date) / 4.0 AS freq
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-28 days')""",
        (user_id,),
    ).fetchone()
    freq = round(float(freq_row["freq"] or 0), 1)

    # Missed days = 14 - active days in last 2 weeks
    miss_row = db.execute(
        """SELECT COUNT(DISTINCT workout_date) AS active
           FROM workouts
           WHERE user_id = ? AND workout_date >= DATE('now', '-14 days')""",
        (user_id,),
    ).fetchone()
    missed = max(0, 14 - int(miss_row["active"] or 0))

    consist = _consistency_score(user_id)
    motiv   = 6  # Default; can be updated via daily log

    result = predict_quit(
        freq, missed, motiv, consist,
        current_app.config["ML_MODEL_PATH"],
    )
    result.update({"computed_frequency": freq, "computed_missed": missed,
                   "computed_consistency": consist})
    return jsonify(result)


# ── RETRAIN MODEL ────────────────────────────

@ml_bp.route("/api/ml/train", methods=["POST"])
def retrain():
    metrics = train_model(current_app.config["ML_MODEL_PATH"])
    return jsonify(success=True, metrics=metrics)


# ── NUTRITION PLAN ───────────────────────────

@ml_bp.route("/api/ml/nutrition", methods=["POST"])
def nutrition():
    d    = request.get_json(force=True)
    goal = d.get("goal", "muscle_gain")
    return jsonify(nutrition_plan(goal))
