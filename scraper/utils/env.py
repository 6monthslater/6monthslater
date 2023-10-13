import os
from dotenv import load_dotenv

load_dotenv()

defaults = {
    "AMAZON_COOKIE": "csm-sid=568-8411815-1797105; session-id=140-6102862-5001741; session-id-time=2082787201l"
}

def get_env(name: str) -> str | None:
    return os.getenv(name)