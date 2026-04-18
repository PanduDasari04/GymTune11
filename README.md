# 🏋️ GymTune v2 — AI-Powered Fitness Intelligence Platform

> Production-ready full-stack fitness app · Flask Blueprints · scikit-learn ML · Industrial dark UI

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [REST API Reference](#rest-api-reference)
5. [ML Model Deep-Dive](#ml-model-deep-dive)
6. [Science Behind Features](#science-behind-features)
7. [Frontend Architecture](#frontend-architecture)
8. [Config & Environment](#config--environment)
9. [Future Scope](#future-scope)

---

## ⚡ Quick Start

### 1 — Install dependencies
```bash
pip install flask scikit-learn pandas numpy
```

### 2 — Run the server
```bash
python app.py
# Server starts at http://localhost:5000
# ML model auto-trains on first boot (~1 second)
# SQLite database auto-creates on first boot
```

### 3 — Open in browser
```
http://localhost:5000
```
→ Register → Click "🎲 Load Demo Data" → Explore all features

### Generate CSV dataset (for Tableau / Excel)
```bash
python generate_dataset.py
# Creates quit_prediction_dataset.csv (500 rows)
```

---

## 📁 Project Structure

```
gymtune2/
│
├── app.py                          ← Entry point: python app.py
├── requirements.txt                ← pip dependencies
├── generate_dataset.py             ← Exports ML training CSV
│
├── config/
│   ├── __init__.py
│   └── settings.py                 ← DevelopmentConfig / ProductionConfig / TestingConfig
│
└── app/
    ├── __init__.py                 ← create_app() factory, blueprint registration, error handlers
    │
    ├── models/
    │   ├── __init__.py
    │   └── database.py             ← SQLite connection, SCHEMA_SQL, hash_password()
    │
    ├── ml/
    │   ├── __init__.py
    │   ├── model.py                ← sklearn Pipeline, training, prediction, all science utils
    │   └── quit_model.pkl          ← Auto-generated on first boot (gitignore this)
    │
    ├── blueprints/
    │   ├── __init__.py
    │   ├── auth.py                 ← /api/auth/{register,login,me}
    │   ├── workouts.py             ← /api/workouts/{log,history,weekly,seed-demo}
    │   ├── analytics.py            ← /api/analytics/{bmi,calories,fat-loss,running,detect-activity,...}
    │   ├── ml_routes.py            ← /api/ml/{predict-quit,auto-predict,nutrition,train}
    │   ├── main.py                 ← /dashboard, /nutrition, /api/dashboard/summary
    │   └── profile.py              ← /profile, /api/profile/{get,update,export-csv,streak-history,delete}
    │
    ├── templates/
    │   ├── index.html              ← Login / Register (split-panel layout)
    │   ├── dashboard.html          ← Main dashboard (10 panels, sidebar nav)
    │   ├── workout.html            ← Workout logging + live calorie estimator
    │   ├── nutrition.html          ← Protein foods + meal plan generator
    │   ├── analytics.html          ← Full analytics deep-dive page
    │   ├── profile.html            ← Profile edit, heatmap, lifetime stats, export
    │   └── 404.html                ← Custom error page
    │
    └── static/
        ├── css/
        │   ├── main.css            ← Full design system (variables, components, utilities)
        │   └── auth.css            ← Auth landing page styles
        └── js/
            ├── utils.js            ← Shared: API helpers, toast, animateNumber, gauge builder
            ├── dashboard.js        ← All 10 dashboard panel controllers + Chart.js builders
            ├── workout.js          ← Log form, live calorie calc, recent history
            ├── nutrition.js        ← Meal plan generator, food grids, macro chart
            ├── analytics.js        ← Deep analytics, auto quit risk, fat loss
            └── profile.js          ← Profile data, heatmap, trend chart, edit/delete
```

---

## 🗄️ Database Schema

### `users`
| Column      | Type      | Notes                                           |
|-------------|-----------|-------------------------------------------------|
| id          | INTEGER   | Primary key, auto-increment                     |
| username    | TEXT      | Unique                                          |
| email       | TEXT      | Unique, lowercased on insert                    |
| password    | TEXT      | SHA-256 hashed                                  |
| age         | INTEGER   | Optional                                        |
| weight      | REAL      | kg — used in calorie calculation                |
| height      | REAL      | cm — used in BMI calculation                    |
| goal        | TEXT      | muscle_gain / fat_loss / general_fitness / endurance |
| streak      | INTEGER   | Consecutive workout days (auto-updated on log)  |
| created_at  | TIMESTAMP | Auto                                            |

### `workouts`
| Column          | Type    | Notes                                         |
|-----------------|---------|-----------------------------------------------|
| id              | INTEGER | PK                                            |
| user_id         | INTEGER | FK → users(id) ON DELETE CASCADE              |
| activity_type   | TEXT    | running / walking / cycling / gym_strength …  |
| duration        | INTEGER | Minutes                                       |
| calories_burned | REAL    | Auto-calculated via MET formula               |
| distance        | REAL    | km (optional)                                 |
| steps           | INTEGER | Optional                                      |
| speed           | REAL    | km/h (optional)                               |
| notes           | TEXT    | Free text                                     |
| workout_date    | DATE    | Defaults to today                             |

### `daily_logs`
| Column                  | Type    | Notes                     |
|-------------------------|---------|---------------------------|
| user_id                 | INTEGER | FK → users                |
| log_date                | DATE    | UNIQUE per user per day   |
| total_calories_burned   | REAL    |                           |
| total_calories_consumed | REAL    | Default 2000              |
| total_steps             | INTEGER |                           |
| motivation_level        | INTEGER | 1–10                      |

### `quit_predictions`
| Column            | Type    | Notes                           |
|-------------------|---------|---------------------------------|
| user_id           | INTEGER | FK → users                      |
| quit_probability  | REAL    | 0.0–100.0 output from sklearn   |
| risk_level        | TEXT    | Low / Medium / High             |
| workout_frequency | REAL    | Input feature                   |
| missed_days       | INTEGER | Input feature                   |
| motivation_level  | INTEGER | Input feature                   |
| consistency_score | REAL    | Input feature                   |

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint               | Body / Params           | Response                    |
|--------|------------------------|-------------------------|-----------------------------|
| POST   | `/api/auth/register`   | username, email, password, age?, weight?, height?, goal? | `{success, user_id}` |
| POST   | `/api/auth/login`      | email, password         | `{success, username}`       |
| GET    | `/api/auth/me`         | —                       | `{authenticated, user}`     |

### Workouts
| Method | Endpoint                    | Notes                                     |
|--------|-----------------------------|-------------------------------------------|
| POST   | `/api/workouts/log`         | Log workout; auto-calculates calories     |
| GET    | `/api/workouts/history`     | Last 50 workouts                          |
| GET    | `/api/workouts/weekly`      | Aggregated last 7 days                    |
| POST   | `/api/workouts/seed-demo`   | Fills 25 days of realistic demo data      |

### Analytics
| Method | Endpoint                          | Body                              |
|--------|-----------------------------------|-----------------------------------|
| POST   | `/api/analytics/bmi`              | `{weight, height}`                |
| POST   | `/api/analytics/calories`         | `{activity, weight, duration}`    |
| GET    | `/api/analytics/fat-loss`         | Uses session user's workout data  |
| POST   | `/api/analytics/running`          | `{age, speed}`                    |
| POST   | `/api/analytics/detect-activity`  | `{speed, steps_per_min}`          |
| GET    | `/api/analytics/met-values`       | Returns MET lookup table          |
| GET    | `/api/analytics/running-benchmarks` | Returns all age-group averages  |

### ML
| Method | Endpoint                  | Body / Notes                                      |
|--------|---------------------------|---------------------------------------------------|
| POST   | `/api/ml/predict-quit`    | Manual: `{workout_frequency, missed_days, motivation_level, consistency_score}` |
| GET    | `/api/ml/auto-predict`    | Computes all 4 features from real workout history |
| POST   | `/api/ml/nutrition`       | `{goal}` → full meal plan + food sources         |
| POST   | `/api/ml/train`           | Retrains model, returns accuracy metrics          |

### Profile
| Method | Endpoint                       | Notes                                    |
|--------|--------------------------------|------------------------------------------|
| GET    | `/api/profile`                 | Full profile + lifetime stats            |
| POST   | `/api/profile/update`          | Update age/weight/height/goal/password   |
| GET    | `/api/profile/export-csv`      | Downloads workouts as CSV file           |
| GET    | `/api/profile/streak-history`  | Last 60 days for heatmap                 |
| POST   | `/api/profile/delete`          | Permanently deletes account + data       |

### Dashboard
| Method | Endpoint                  | Returns                                   |
|--------|---------------------------|-------------------------------------------|
| GET    | `/api/dashboard/summary`  | user, stats, activities, weekly_data, bmi, consistency_score |

---

## 🤖 ML Model Deep-Dive

### Algorithm
**Logistic Regression** via `sklearn.pipeline.Pipeline`:
```
Pipeline([
    ('scaler', StandardScaler()),
    ('clf',    LogisticRegression(C=1.0, class_weight='balanced', max_iter=300))
])
```

### Training Data
- **600 synthetic samples** generated by `generate_dataset()` in `app/ml/model.py`
- **80/20 train/test split** with stratification
- **Typical accuracy: 90–93%**

### Feature Engineering
| Feature            | Range    | Weight  | Effect on quit risk |
|--------------------|----------|---------|---------------------|
| workout_frequency  | 0–7/week | −2.5    | More sessions → lower risk |
| missed_days        | 0–14     | +3.0    | More misses → higher risk  |
| motivation_level   | 1–10     | −2.0    | Higher motivation → lower risk |
| consistency_score  | 0–100%   | −1.8    | More consistent → lower risk |

### Logit Formula (ground truth used to label training data)
```
z = -2.5×(freq/5) + 3.0×(miss/14) - 2.0×(motiv/10) - 1.8×(consist/100) + 0.8
P(quit) = sigmoid(z) = 1 / (1 + e^(-z))
```

### Risk Levels
| Probability | Risk Level | Action |
|-------------|------------|--------|
| < 30%       | Low 🟢    | Keep going!  |
| 30–60%      | Medium 🟡 | Monitor and improve |
| ≥ 60%       | High 🔴   | Intervention needed |

### Auto-Predict Flow
`/api/ml/auto-predict` calculates all 4 features automatically:
- **frequency** = `active_days_last_28 / 4.0`
- **missed**    = `14 - active_days_last_14`
- **consistency** = `active_days_last_30 / 30 × 100`
- **motivation**  = 6 (default; can be set via daily log)

---

## 🔬 Science Behind Features

### MET Calorie Formula
```
Calories = MET × Weight(kg) × Duration(hours)
```
| Activity    | MET  |
|-------------|------|
| Jump Rope   | 12.0 |
| HIIT        | 10.0 |
| Running     | 9.8  |
| Swimming    | 8.0  |
| Cycling     | 7.5  |
| Elliptical  | 5.5  |
| Gym/Strength| 5.0  |
| Walking     | 3.5  |
| Yoga        | 2.5  |

### 7700 Calorie Rule
> 1 kg of body fat ≈ **7,700 kcal** of stored energy.
> A daily deficit of 550 kcal → ~0.5 kg fat loss per week.

### BMI Formula
```
BMI = Weight(kg) / Height(m)²
```
| BMI         | Category    |
|-------------|-------------|
| < 18.5      | Underweight |
| 18.5 – 24.9 | Normal      |
| 25 – 29.9   | Overweight  |
| ≥ 30        | Obese       |

### Activity Detection Rules
```
speed < 1  km/h, steps/min < 20  → Resting
speed < 5  km/h, steps/min < 80  → Walking
speed < 10 km/h, steps/min < 140 → Jogging
speed ≥ 10 km/h, steps/min ≥ 140 → Running
```

### Running Benchmarks (avg km/h)
| Age Group | Avg Speed | Avg Pace    |
|-----------|-----------|-------------|
| 18–25     | 11.5 km/h | 5:12 min/km |
| 26–35     | 10.8 km/h | 5:33 min/km |
| 36–50     | 9.8  km/h | 6:07 min/km |
| 51+       | 8.5  km/h | 7:03 min/km |

---

## 🎨 Frontend Architecture

### Design System
- **Theme**: Industrial precision dark, amber/gold accents
- **Fonts**: Syne (display, headings) + Instrument Sans (body) + JetBrains Mono (labels/code)
- **CSS Variables**: Full token system in `main.css` — change one variable to retheme
- **Charts**: Chart.js 4.4 — bar, line, doughnut, gauge (half-doughnut), pie, horizontal bar

### JavaScript Pattern
All pages follow the same pattern:
1. `DOMContentLoaded` → call `loadXxx()` functions
2. Each function does one `fetch()` API call
3. Data is rendered into DOM or Chart.js instance
4. `toast()` for user feedback
5. `animNum()` for number countup animations

### Pages
| Route        | Template           | JS File          |
|--------------|--------------------|------------------|
| `/`          | `index.html`       | inline           |
| `/dashboard` | `dashboard.html`   | `dashboard.js`   |
| `/workout`   | `workout.html`     | `workout.js`     |
| `/nutrition` | `nutrition.html`   | `nutrition.js`   |
| `/analytics` | `analytics.html`   | `analytics.js`   |
| `/profile`   | `profile.html`     | `profile.js`     |

---

## ⚙️ Config & Environment

```python
# config/settings.py

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True
    DATABASE_PATH = ":memory:"
```

Set environment via:
```bash
FLASK_ENV=production python app.py
```

Key config values:
```python
SECRET_KEY        = "set via env var SECRET_KEY"
DATABASE_PATH     = "./gymtune.db"
ML_MODEL_PATH     = "./app/ml/quit_model.pkl"
CALORIES_PER_KG_FAT = 7700
```

---

## 🔮 Future Scope

| Feature | Implementation Hint |
|---------|---------------------|
| Wearable sync | Fitbit/Garmin REST API → `/api/workouts/sync-wearable` |
| Push reminders | `flask-mail` or Firebase Cloud Messaging |
| PDF export | `reportlab` or `weasyprint` → `/api/profile/export-pdf` |
| OAuth login | `flask-dance` (Google, GitHub) |
| Real-time updates | WebSockets via `flask-socketio` |
| Advanced ML | XGBoost + SHAP explainability |
| Tableau export | Write `.xlsx` via `openpyxl` |
| Docker deploy | `Dockerfile` + `gunicorn` |

---

## 📊 Tech Stack Summary

| Layer         | Technology                                          |
|---------------|-----------------------------------------------------|
| Backend       | Python 3.10+ · Flask 3.x · Blueprint architecture  |
| Database      | SQLite (via `sqlite3`) · 4 tables · FK constraints  |
| ML            | scikit-learn · Logistic Regression · Pipeline       |
| Data          | Pandas · NumPy · CSV export                         |
| Frontend      | HTML5 · CSS3 (custom design system) · Vanilla JS    |
| Charts        | Chart.js 4.4 (CDN)                                  |
| Fonts         | Google Fonts — Syne, Instrument Sans, JetBrains Mono|
| Auth          | Flask sessions · SHA-256 password hashing           |

---

*GymTune v2 — Built for final-year placement portfolio.*
*Clean · Modular · Fully functional · Impressive.*
