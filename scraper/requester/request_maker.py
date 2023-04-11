from curl_cffi import requests

cookie_file = "cookies.txt"

class RequestError(Exception):
    pass

session = requests.Session()

def request_page(url: str) -> str:
    """
    Requests a page from the given URL and returns the response body using pycurl
    and preset headers.
    """

    r = session.get(url, impersonate="chrome110")

    if r.status_code != 200 or not isinstance(r.text, str):
        raise RequestError(f"Failed to fetch {url} with status code: {r.status_code}")

    return r.text

def reset_cookies() -> None:
    """
    Resets the cookies in the current session.
    """
    session.cookies.clear()