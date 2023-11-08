import os
from dotenv import load_dotenv

load_dotenv()

defaults = {
    "AMAZON_COOKIE": "csm-sid=568-8411815-1797105; session-id=140-6102862-5001741; session-id-time=2082787201l",
    "QUEUE_PREFETCH_COUNT": "10",
}

def get_env(name: str) -> str:
    result = os.getenv(name)
    if result is None and name in defaults:
        return defaults[name]
    else:
        return result or ""

def get_env_int(name: str) -> int:
    return int(get_env(name))