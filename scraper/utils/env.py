import os
from dotenv import load_dotenv

load_dotenv()

def get_env(name: str) -> str | None:
    return os.getenv(name)