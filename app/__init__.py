"""
GymTune — Application Factory
Handles: app creation, blueprint registration, CORS, error handlers, ML pre-training.
CORS is implemented without flask-cors using Flask's after_request / before_request hooks.
"""
from flask import Flask, request, make_response, jsonify, render_template
from config import get_config
from app.models import close_db, init_db
from app.blueprints import auth_bp, workouts_bp, analytics_bp, ml_bp, main_bp, profile_bp, goals_bp


def _apply_cors(app: Flask) -> None:
    """
    Attach CORS headers to every response and handle preflight OPTIONS requests.
    Works without any third-party library.
    """

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        allowed = app.config.get("CORS_ORIGINS", [])
        # "*" in allowed means testing mode — accept all
        if "*" in allowed or origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, X-Requested-With, Authorization"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, DELETE, OPTIONS"
            )
        return response

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            resp = make_response()
            origin = request.headers.get("Origin", "")
            allowed = app.config.get("CORS_ORIGINS", [])
            if "*" in allowed or origin in allowed:
                resp.headers["Access-Control-Allow-Origin"] = origin or "*"
                resp.headers["Access-Control-Allow-Credentials"] = "true"
                resp.headers["Access-Control-Allow-Headers"] = (
                    "Content-Type, X-Requested-With, Authorization"
                )
                resp.headers["Access-Control-Allow-Methods"] = (
                    "GET, POST, PUT, DELETE, OPTIONS"
                )
            return resp, 204


def create_app(env: str = "development") -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__, template_folder="templates", static_folder="static")

    # ── Configuration ─────────────────────────────────
    cfg = get_config(env)
    app.config.from_object(cfg)

    # ── CORS (no flask-cors dependency) ───────────────
    _apply_cors(app)

    # ── Database teardown ──────────────────────────────
    app.teardown_appcontext(close_db)

    # ── Register Blueprints ────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(workouts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(ml_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(goals_bp)

    # ── Initialise DB + pre-train ML ───────────────────
    with app.app_context():
        init_db(app)
        _ensure_ml_model(app)

    # ── Error handlers ─────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify(error="Not found"), 404
        # React SPA catch-all: any non-API, non-static path returns index.html
        try:
            return render_template("spa.html"), 200
        except Exception:
            return jsonify(error="Not found"), 404

    @app.errorhandler(500)
    def server_error(e):
        app.logger.exception("Internal server error: %s", e)
        if request.path.startswith("/api/"):
            return jsonify(error="Internal server error"), 500
        return jsonify(error="Internal server error"), 500

    return app


def _ensure_ml_model(app: Flask) -> None:
    """Train the ML model on first run if the pickle file does not exist."""
    import os
    from app.ml import train_model
    model_path = app.config["ML_MODEL_PATH"]
    if not os.path.exists(model_path):
        app.logger.info("Training ML quit-prediction model...")
        metrics = train_model(model_path)
        app.logger.info("Model trained — Accuracy: %s%%", metrics["accuracy"])
