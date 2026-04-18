"""
GymTune — Machine Learning Module
Quit Prediction using Logistic Regression (scikit-learn)

Pipeline:
  1. generate_dataset()  → create synthetic training data with Pandas
  2. train_model()       → train LogisticRegression, persist to disk
  3. predict()           → load model and return probability + risk
"""

import os
import math
import pickle
import random

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# ─────────────────────────────────────────────
# 1. SYNTHETIC DATASET GENERATION
# ─────────────────────────────────────────────

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def generate_dataset(n_samples: int = 500, seed: int = 42) -> pd.DataFrame:
    """
    Generate a labelled synthetic dataset for quit-prediction training.

    Features
    --------
    workout_frequency  : float  [0 – 7]   workouts per week
    missed_days        : int    [0 – 14]  missed workouts in last 2 weeks
    motivation_level   : int    [1 – 10]  self-reported motivation
    consistency_score  : float  [0 – 100] % of days active in last 30 days

    Label
    -----
    quit (0 = stays, 1 = quits)
    """
    rng = random.Random(seed)
    np.random.seed(seed)

    rows = []
    for _ in range(n_samples):
        freq       = round(rng.uniform(0, 7), 1)
        missed     = rng.randint(0, 14)
        motivation = rng.randint(1, 10)
        consist    = round(rng.uniform(0, 100), 1)

        # Logistic regression ground-truth weights (mirrored in prediction)
        z = (
            -2.5 * (freq / 5.0)
            + 3.0 * (missed / 14.0)
            - 2.0 * (motivation / 10.0)
            - 1.8 * (consist / 100.0)
            + 0.8
        )
        prob = _sigmoid(z)
        # Add realistic label noise
        noisy_prob = np.clip(prob + np.random.normal(0, 0.07), 0, 1)
        label = 1 if noisy_prob > 0.5 else 0

        rows.append(
            dict(
                workout_frequency=freq,
                missed_days=missed,
                motivation_level=motivation,
                consistency_score=consist,
                quit_probability=round(noisy_prob * 100, 1),
                quit=label,
            )
        )

    df = pd.DataFrame(rows)
    return df


# ─────────────────────────────────────────────
# 2. MODEL TRAINING
# ─────────────────────────────────────────────

FEATURE_COLS = [
    "workout_frequency",
    "missed_days",
    "motivation_level",
    "consistency_score",
]


def train_model(model_path: str) -> dict:
    """
    Train a LogisticRegression pipeline on synthetic data and
    persist it with pickle.  Returns training metrics.
    """
    df = generate_dataset(n_samples=600)

    X = df[FEATURE_COLS].values
    y = df["quit"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Pipeline: StandardScaler + LogisticRegression
    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    C=1.0,
                    max_iter=300,
                    solver="lbfgs",
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = round(accuracy_score(y_test, y_pred) * 100, 2)
    report = classification_report(y_test, y_pred, output_dict=True)

    # Persist model
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)

    return {
        "accuracy": acc,
        "precision": round(report["1"]["precision"] * 100, 2),
        "recall": round(report["1"]["recall"] * 100, 2),
        "f1": round(report["1"]["f1-score"] * 100, 2),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }


# ─────────────────────────────────────────────
# 3. PREDICTION
# ─────────────────────────────────────────────

_cached_pipeline = None


def _load_pipeline(model_path: str):
    global _cached_pipeline
    if _cached_pipeline is None:
        if not os.path.exists(model_path):
            train_model(model_path)
        with open(model_path, "rb") as f:
            _cached_pipeline = pickle.load(f)
    return _cached_pipeline


def _personalized_recommendations(
    freq: float,
    missed: int,
    motivation: int,
    consist: float,
    risk: str,
) -> list[str]:
    recs = []
    if missed > 6:
        recs.append("⚡ You've skipped many sessions. Try the '2-day rule': never miss more than 2 consecutive days.")
    if motivation < 4:
        recs.append("🎯 Your motivation is low. Set one tiny goal for this week and celebrate it.")
    if freq < 2:
        recs.append("📅 Aim for at least 3 workouts/week. Even 20-minute sessions count!")
    if consist < 40:
        recs.append("🔥 Consistency beats intensity. Schedule fixed workout slots in your calendar.")
    if risk == "High":
        recs.append("🚨 High dropout risk detected. Consider finding a workout partner for accountability.")
        recs.append("💬 Try reducing workout intensity — burn-out is the #1 reason people quit.")
    elif risk == "Medium":
        recs.append("⚠️ Moderate risk. Track your workouts daily — awareness drives habit formation.")
    if not recs:
        recs.append("💪 You're on track! Keep your current routine and stay hydrated.")
        recs.append("🏆 Reward yourself after hitting 30 consecutive days — you deserve it.")
    return recs


def predict_quit(
    workout_frequency: float,
    missed_days: int,
    motivation_level: int,
    consistency_score: float,
    model_path: str,
) -> dict:
    """
    Predict quit probability using the trained sklearn pipeline.

    Returns
    -------
    dict with keys: quit_probability, risk_level, recommendations
    """
    pipeline = _load_pipeline(model_path)

    features = np.array(
        [[workout_frequency, missed_days, motivation_level, consistency_score]]
    )

    prob = float(pipeline.predict_proba(features)[0][1])  # P(quit=1)
    prob_pct = round(prob * 100, 1)

    if prob_pct < 30:
        risk = "Low"
    elif prob_pct < 60:
        risk = "Medium"
    else:
        risk = "High"

    recs = _personalized_recommendations(
        workout_frequency, missed_days, motivation_level, consistency_score, risk
    )

    return {
        "quit_probability": prob_pct,
        "risk_level": risk,
        "recommendations": recs,
    }


# ─────────────────────────────────────────────
# 4. SCIENCE UTILITIES (used by analytics)
# ─────────────────────────────────────────────

MET_VALUES = {
    "running":      9.8,
    "jogging":      7.0,
    "walking":      3.5,
    "cycling":      7.5,
    "swimming":     8.0,
    "gym_strength": 5.0,
    "hiit":         10.0,
    "yoga":         2.5,
    "elliptical":   5.5,
    "jump_rope":    12.0,
    "resting":      1.0,
}


def calc_calories_met(activity: str, weight_kg: float, duration_min: float) -> float:
    met = MET_VALUES.get(activity, 5.0)
    return round(met * weight_kg * (duration_min / 60.0), 2)


def calc_bmi(weight_kg: float, height_cm: float) -> dict:
    h = height_cm / 100.0
    bmi = round(weight_kg / (h ** 2), 1)
    if bmi < 18.5:
        cat, color = "Underweight", "#60a5fa"
    elif bmi < 25.0:
        cat, color = "Normal", "#34d399"
    elif bmi < 30.0:
        cat, color = "Overweight", "#fbbf24"
    else:
        cat, color = "Obese", "#f87171"
    return {"bmi": bmi, "category": cat, "color": color}


def detect_activity(speed_kmh: float, steps_per_min: float) -> dict:
    s, p = speed_kmh or 0, steps_per_min or 0
    if s < 1 and p < 20:
        act, emoji, color = "Resting",  "😴", "#60a5fa"
    elif s < 5 or p < 80:
        act, emoji, color = "Walking",  "🚶", "#fbbf24"
    elif s < 10 or p < 140:
        act, emoji, color = "Jogging",  "🏃", "#fb923c"
    else:
        act, emoji, color = "Running",  "⚡", "#34d399"
    return {"activity": act, "emoji": emoji, "color": color}


RUNNING_BENCHMARKS = [
    {"group": "18–25", "avg_speed": 11.5, "avg_pace": "5:12 min/km"},
    {"group": "26–35", "avg_speed": 10.8, "avg_pace": "5:33 min/km"},
    {"group": "36–50", "avg_speed": 9.8,  "avg_pace": "6:07 min/km"},
    {"group": "51+",   "avg_speed": 8.5,  "avg_pace": "7:03 min/km"},
]


def running_benchmark(age: int, user_speed: float) -> dict:
    if age <= 25:    bench = RUNNING_BENCHMARKS[0]
    elif age <= 35:  bench = RUNNING_BENCHMARKS[1]
    elif age <= 50:  bench = RUNNING_BENCHMARKS[2]
    else:            bench = RUNNING_BENCHMARKS[3]

    score = round(min((user_speed / bench["avg_speed"]) * 100, 150), 1)
    if score >= 110:  label = "Excellent 🏆"
    elif score >= 90: label = "Good 💪"
    elif score >= 70: label = "Average 👍"
    else:             label = "Keep Training! 🎯"

    return {**bench, "user_speed": user_speed, "score": score, "label": label}


NUTRITION_DATA = {
    "muscle_gain": {
        "veg": [
            {"name": "Paneer (100g)",        "protein": 18, "calories": 265},
            {"name": "Lentils – 1 cup",       "protein": 18, "calories": 230},
            {"name": "Chickpeas – 1 cup",     "protein": 15, "calories": 269},
            {"name": "Greek Yogurt – 1 cup",  "protein": 17, "calories": 100},
            {"name": "Tofu (100g)",           "protein": 8,  "calories": 76},
            {"name": "Quinoa – 1 cup",        "protein": 8,  "calories": 222},
            {"name": "Almonds (30g)",         "protein": 6,  "calories": 174},
        ],
        "nonveg": [
            {"name": "Chicken Breast (100g)", "protein": 31, "calories": 165},
            {"name": "Whole Eggs × 2",        "protein": 12, "calories": 144},
            {"name": "Tuna (100g)",           "protein": 29, "calories": 132},
            {"name": "Salmon (100g)",         "protein": 25, "calories": 208},
            {"name": "Egg Whites × 3",        "protein": 11, "calories": 51},
        ],
        "meal_plan": [
            {"meal": "Breakfast",    "items": "Oats + Banana + 3 Egg Whites + Milk",          "protein": 30, "calories": 450},
            {"meal": "Mid-Morning",  "items": "Greek Yogurt + Almonds",                         "protein": 20, "calories": 250},
            {"meal": "Lunch",        "items": "Chicken Breast + Brown Rice + Salad",            "protein": 45, "calories": 600},
            {"meal": "Pre-Workout",  "items": "Banana + Peanut Butter",                         "protein": 8,  "calories": 250},
            {"meal": "Post-Workout", "items": "Whey Protein Shake + Banana",                    "protein": 30, "calories": 300},
            {"meal": "Dinner",       "items": "Paneer Curry + Roti + Dal",                      "protein": 35, "calories": 550},
        ],
    },
    "fat_loss": {
        "veg": [
            {"name": "Low-fat Yogurt – 1 cup","protein": 12, "calories": 110},
            {"name": "Sprouts – 1 cup",        "protein": 7,  "calories": 31},
            {"name": "Cottage Cheese (100g)",  "protein": 11, "calories": 98},
            {"name": "Edamame – 1 cup",        "protein": 17, "calories": 189},
            {"name": "Broccoli + Tofu Bowl",   "protein": 14, "calories": 150},
        ],
        "nonveg": [
            {"name": "Grilled Chicken (100g)", "protein": 31, "calories": 165},
            {"name": "Boiled Eggs × 2",        "protein": 12, "calories": 144},
            {"name": "Shrimp (100g)",          "protein": 24, "calories": 99},
            {"name": "Turkey Breast (100g)",   "protein": 29, "calories": 135},
        ],
        "meal_plan": [
            {"meal": "Breakfast",   "items": "Boiled Eggs + Whole Wheat Toast + Green Tea",     "protein": 18, "calories": 280},
            {"meal": "Mid-Morning", "items": "Apple + Handful of Nuts",                          "protein": 4,  "calories": 150},
            {"meal": "Lunch",       "items": "Grilled Chicken + Salad + Lemon Water",            "protein": 35, "calories": 350},
            {"meal": "Snack",       "items": "Low-fat Yogurt + Cucumber",                        "protein": 12, "calories": 120},
            {"meal": "Dinner",      "items": "Dal + Vegetables + 1 Roti",                        "protein": 20, "calories": 300},
        ],
    },
}


def nutrition_plan(goal: str) -> dict:
    plan = NUTRITION_DATA.get(goal, NUTRITION_DATA["muscle_gain"])
    meals = plan["meal_plan"]
    return {
        "goal": goal,
        "veg": plan["veg"],
        "nonveg": plan["nonveg"],
        "meal_plan": meals,
        "totals": {
            "protein": sum(m["protein"] for m in meals),
            "calories": sum(m["calories"] for m in meals),
        },
    }
