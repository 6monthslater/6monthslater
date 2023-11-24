from curl_cffi import requests
from retry import retry

from utils.env import get_env

cookie_file = "cookies.txt"

class RequestError(Exception):
    pass

session = requests.Session()
cookie = get_env("AMAZON_COOKIE")

@retry(RequestError, tries=2, delay=2)
def request_page(url: str) -> str:
    """
    Requests a page from the given URL and returns the response body using pycurl
    and preset headers.
    """

    proxy_url = get_env("PROXY_URL")

    r = session.get(url, impersonate="chrome107", headers={
        'cookie': cookie
    } if cookie else None, proxies={
        "https": proxy_url,
        "http": proxy_url
    })

    if r.status_code != 200 or not isinstance(r.text, str):
        raise RequestError(f"Failed to fetch {url} with status code: {r.status_code}")

    if "Type the characters you see in this image" in r.text:
        raise RequestError(f"Failed to fetch {url} due to captcha")

    return r.text

def reset_cookies() -> None:
    """
    Resets the cookies in the current session.
    """
    session.cookies.clear()