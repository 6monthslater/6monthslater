from listener.crawler import start_crawling_listener
from utils.env import get_env, get_env_int

start_crawling_listener(get_env("QUEUE_HOST"), get_env_int("QUEUE_PORT"))