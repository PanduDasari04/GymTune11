"""
GymTune Database Module
Handles SQLite connection, schema creation, and query helpers.
"""
import sqlite3
import hashlib
import os
from flask import g, current_app


# ─────────────────────────────────────────────
# CONNECTION MANAGEMENT
# ─────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    """Get a database connection bound to the Flask application context."""
    if "db" not in g:
        g.db = sqlite3.connect(
            current_app.config["DATABASE_PATH"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    """Close the database connection at the end of a request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


# ─────────────────────────────────────────────
# SCHEMA INITIALISATION
# ─────────────────────────────────────────────

SCHEMA_SQL = """
-- ── USERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    age         INTEGER,
    weight      REAL,
    height      REAL,
    goal        TEXT    DEFAULT 'general_fitness',
    streak      INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── WORKOUTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    activity_type   TEXT    NOT NULL,
    duration        INTEGER NOT NULL,          -- minutes
    calories_burned REAL    DEFAULT 0,
    distance        REAL,                      -- km
    steps           INTEGER,
    speed           REAL,                      -- km/h
    notes           TEXT,
    workout_date    DATE    DEFAULT (DATE('now')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── DAILY LOGS ──────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    log_date                DATE    DEFAULT (DATE('now')),
    total_calories_burned   REAL    DEFAULT 0,
    total_calories_consumed REAL    DEFAULT 2000,
    total_steps             INTEGER DEFAULT 0,
    total_duration          INTEGER DEFAULT 0,
    water_intake            REAL    DEFAULT 0,
    motivation_level        INTEGER DEFAULT 5,
    UNIQUE(user_id, log_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── QUIT PREDICTIONS ────────────────────────
CREATE TABLE IF NOT EXISTS quit_predictions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL,
    prediction_date     DATE    DEFAULT (DATE('now')),
    quit_probability    REAL,
    risk_level          TEXT,
    workout_frequency   REAL,
    missed_days         INTEGER,
    motivation_level    INTEGER,
    consistency_score   REAL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── INDEXES ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workouts_user_date
    ON workouts(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
    ON daily_logs(user_id, log_date);
"""


def init_db(app):
    """Initialise the database schema using the app context."""
    with app.app_context():
        db_path = app.config["DATABASE_PATH"]
        conn = sqlite3.connect(db_path)
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        conn.close()


# ─────────────────────────────────────────────
# UTILITY HELPERS
# ─────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed
