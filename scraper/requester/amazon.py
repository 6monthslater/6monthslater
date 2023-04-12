from enum import Enum
from requester.request_maker import request_page, RequestError, reset_cookies
from retry import retry

class AmazonRegion(Enum):
    COM = "com"
    CA = "ca"

@retry(RequestError, tries=10, delay=2)
def request_reviews(region: AmazonRegion, product_id: str, page: int = 0) -> str:
    """
    Requests the reviews page for a product. 
    Resets cookies on error.
    Auto retries on RequestError.
    """
    try:
        return request_page(url_for_reviews(region, product_id, page))
    except RequestError:
        reset_cookies()
        raise
        

def url_for_reviews(region: AmazonRegion, product_id: str, page: int = 0) -> str:
    attributes = []
    if page > 0:
        attributes.append(f"pageNumber={page + 1}")
    attributes_str = "" if len(attributes) == 0 else f"?{'&'.join(attributes)}"

    return f"https://{domain_for_region(region)}/product-reviews/{product_id}/{attributes_str}"

def url_for_review(region: AmazonRegion, review_id: str) -> str:
    return f"https://{domain_for_region(region)}/gp/customer-reviews/{review_id}/"

def domain_for_region(region: AmazonRegion) -> str:
    if region == AmazonRegion.COM:
        return "www.amazon.com"
    elif region == AmazonRegion.CA:
        return "www.amazon.ca"
    else:
        raise Exception(f"Unknown region: {region}")