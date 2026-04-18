"""
GymTune v2 — Dataset Generator & Exporter
Generates quit-prediction dataset + exports to CSV for Tableau/Excel analytics
Run: python generate_dataset.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ml.model import generate_dataset

if __name__ == "__main__":
    print("GymTune — Generating Quit Prediction Dataset")
    print("=" * 48)

    df = generate_dataset(n_samples=500)

    # Save CSV
    csv_path = "quit_prediction_dataset.csv"
    df.to_csv(csv_path, index=False)

    print(f"\n✓ Saved {len(df)} samples → {csv_path}")
    print(f"\nDataset Summary:")
    print(f"  Quit rate       : {df['quit'].mean()*100:.1f}%")
    print(f"  Avg frequency   : {df['workout_frequency'].mean():.1f} days/week")
    print(f"  Avg missed days : {df['missed_days'].mean():.1f}")
    print(f"  Avg motivation  : {df['motivation_level'].mean():.1f}/10")
    print(f"  Avg consistency : {df['consistency_score'].mean():.1f}%")

    print(f"\nColumn descriptions:")
    print(f"  workout_frequency  — workouts per week [0–7]")
    print(f"  missed_days        — missed sessions in 2 weeks [0–14]")
    print(f"  motivation_level   — self-reported score [1–10]")
    print(f"  consistency_score  — % active days in 30 days [0–100]")
    print(f"  quit_probability   — model output [0–100]")
    print(f"  quit               — binary label 0=stays 1=quits")
    print(f"  risk_level         — Low/Medium/High")
    print(f"\n📊 Use quit_prediction_dataset.csv in Tableau or Excel for analytics.")
