import json
from typing import Any, Callable
from requester.request_maker import request_page
import bs4
import re

max_pages = 1000

def crawl_for_reviews(url: str, page_num: int, review_info: Any, products_to_ignore: set[str], publish_callback: Callable[[str], None]) -> set[str]:
    """
    Crawl for product urls on a given url on the given page.
    """
    html = request_page(url=f"{url}&page={page_num + 1}")
    page = bs4.BeautifulSoup(html, features="html.parser")

    product_ids_so_far: set[str] = products_to_ignore

    links = page.select("a")
    for link in links:
        if "href" in link.attrs and "/dp/" in link.attrs["href"]:
            match = re.search(r"\/dp\/(.+?)(\/|\?)", link.attrs["href"])
            if match:
                product_id = match.group(1)
                if product_id not in product_ids_so_far:
                    product_ids_so_far.add(product_id)

                    print(f"Found product {product_id}")
                    reviews_json = json.dumps({
                        **review_info,
                        "id": product_id
                    })

                    publish_callback(reviews_json)
            else:
                print(f"Failed to find product id in {link.attrs['href']}")
    
    return product_ids_so_far