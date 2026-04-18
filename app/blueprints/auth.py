"""
GymTune — Auth Blueprint
Handles: register, login, logout, session check.
All routes are pure JSON API endpoints consumed by the React frontend.
The / route now serves the React SPA shell (spa.html) so the browser
lands on the React app directly at the root URL.
"""
from flask import (
    Blueprint, request, jsonify, session, render_template, redirect, url_for,
)
from app.models import get_db, hash_password, verify_password

auth_bp = Blueprint("auth", __name__)


# ── Root → React SPA ──────────────────────────────────────────
@auth_bp.route("/")
def index():
    """Root URL: serve the React SPA. React handles auth state internally."""
    return render_template("spa.html")


# ── Logout (clears Flask session, React redirects to login) ───
@auth_bp.route("/logout")
def logout():
    session.clear()
    # React app calls GET /logout then re-checks /api/auth/me
    # Return JSON so React can handle it, or redirect to root
    return redirect(url_for("auth.index"))


# ── Register ──────────────────────────────────────────────────
@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True)
    required = ("username", "email", "password")
    if not all(data.get(f) for f in required):
        return jsonify(success=False, error="Username, email and password are required"), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO users (username, email, password, age, weight, height, goal)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                data["username"].strip(),
                data["email"].strip().lower(),
                hash_password(data["password"]),
                data.get("age")    or None,
                data.get("weight") or None,
                data.get("height") or None,
                data.get("goal", "general_fitness"),
            ),
        )
        db.commit()
        user = db.execute(
            "SELECT id, username FROM users WHERE email = ?",
            (data["email"].strip().lower(),),
        ).fetchone()
        session["user_id"]  = user["id"]
        session["username"] = user["username"]
        return jsonify(success=True, user_id=user["id"], username=user["username"])
    except Exception as exc:
        # IntegrityError → duplicate username/email
        return jsonify(success=False, error="Username or email already exists"), 409


# ── Login ─────────────────────────────────────────────────────
@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    if not data.get("email") or not data.get("password"):
        return jsonify(success=False, error="Email and password are required"), 400

    db   = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (data["email"].strip().lower(),),
    ).fetchone()

    if user and verify_password(data["password"], user["password"]):
        session["user_id"]  = user["id"]
        session["username"] = user["username"]
        return jsonify(
            success=True,
            username=user["username"],
            user_id=user["id"],
        )
    return jsonify(success=False, error="Invalid email or password"), 401


# ── Session check ─────────────────────────────────────────────
@auth_bp.route("/api/auth/me")
def me():
    if "user_id" not in session:
        return jsonify(authenticated=False), 401

    db   = get_db()
    user = db.execute(
        "SELECT id, username, email, age, weight, height, goal, streak FROM users WHERE id = ?",
        (session["user_id"],),
    ).fetchone()

    if not user:
        session.clear()
        return jsonify(authenticated=False), 401

    return jsonify(authenticated=True, user=dict(user))
