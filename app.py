"""
GymTune — Entry Point
Run with: python app.py
"""
import os
from app import create_app

env = os.environ.get("FLASK_ENV", "development")
application = create_app(env)

if __name__ == "__main__":
    application.run(host="0.0.0.0", port=5000, debug=True)
