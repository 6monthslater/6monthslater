from enum import Enum
from requester.request_maker import request_page

class AmazonRegion(Enum):
    COM = 1
    CA = 2

def request_reviews(region: AmazonRegion, product_id: str, page: int = 0) -> str:
    return request_page(url_for_reviews(region, product_id, page))

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