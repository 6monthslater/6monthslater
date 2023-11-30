import os
from dotenv import load_dotenv

load_dotenv()

defaults = {
    "AMAZON_COOKIE": "csm-sid=568-8411815-1797105; session-id=140-6102862-5001741; session-id-time=2082787201l",
    "ANALYZER_THRESHOLD_OWNERSHIP_REL": "0.9",
    "ANALYZER_THRESHOLD_ISSUE_REL": "0.9",
    "ANALYZER_THRESHOLD_ISSUE_CLASS": "0.1",
    "QUEUE_PREFETCH_COUNT": "10",
    "TRAINING_MODE": "false",
    "QUEUE_HOST": "localhost",
    "QUEUE_PORT": "5673"
}

def get_env(name: str) -> str:
    result = os.getenv(name)
    if result is None and name in defaults:
        return defaults[name]
    else:
        return result or ""

def get_env_int(name: str) -> int:
    return int(get_env(name))

def get_env_bool(name: str) -> bool:
    return get_env(name).lower() in ["true", "1", "yes", "y", "t"]