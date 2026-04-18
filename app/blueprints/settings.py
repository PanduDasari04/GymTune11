"""
GymTune Configuration
Environment-based config classes
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get("SECRET_KEY", "gymtune-dev-secret-2024-xK9#mP2")
    DATABASE_PATH = os.path.join(BASE_DIR, "gymtune.db")
    DEBUG = False
    TESTING = False
    # ML model path
    ML_MODEL_PATH = os.path.join(BASE_DIR, "app", "ml", "quit_model.pkl")
    # Calorie constants
    CALORIES_PER_KG_FAT = 7700
    # Default calorie goal
    DEFAULT_WEEKLY_CALORIE_GOAL = 3500
    DEFAULT_WEEKLY_SESSION_GOAL = 5
    DEFAULT_WEEKLY_STEPS_GOAL = 50000


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    DATABASE_PATH = ":memory:"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config(env: str = "default") -> Config:
    return config_map.get(env, DevelopmentConfig)
