import json
from typing import Any, Callable
from requester.request_maker import request_page
import bs4
import re

max_pages = 1000

def crawl_for_reviews(url: str, page_num: int, review_info: Any, publish_callback: Callable[[str], None]) -> None:
    html = request_page(url=f"{url}&page={page_num + 1}")
    page = bs4.BeautifulSoup(html, features="html.parser")

    links = page.select("a")
    for link in links:
        if "href" in link.attrs and "/dp/" in link.attrs["href"]:
            match = re.search(r"\/dp\/(.+?)(\/|\?)", link.attrs["href"])
            if match:
                print(f"Found product {match.group(1)}")
                reviews_json = json.dumps({
                    **review_info,
                    "id": match.group(1)
                })

                publish_callback(reviews_json)
            else:
                print(f"Failed to find product id in {link.attrs['href']}")