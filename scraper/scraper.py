from listener.parser import start_parsing_listener
from utils.env import get_env, get_env_int

start_parsing_listener(get_env("QUEUE_HOST"), get_env_int("QUEUE_PORT"))