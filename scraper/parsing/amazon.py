import bs4
from requester.amazon import AmazonRegion, request_reviews
import re
from dateutil import parser

max_pages = 1000

class ParsingError(Exception):
    def __init__(self, message: str):
        super().__init__(message)

class Review:
    author_id: str | None
    author_name: str
    author_image_url: str
    title: str
    text: str
    date: int
    date_text: str
    review_id: str | None
    attributes: dict[str, str]
    verified_purchase: bool
    found_helpful_count: int
    is_top_positive_review: bool
    is_top_critical_review: bool
    images: list[str]
    country_reviewed_in: str
    region: AmazonRegion

    def __init__(
        self,
        author_id: str | None,
        author_name: str,
        title: str,
        text: str,
        date: int,
        date_text: str,
        review_id: str | None,
        attributes: dict[str, str],
        verified_purchase: bool,
        found_helpful_count: int,
        is_top_positive_review: bool,
        is_top_critical_review: bool,
        images: list[str],
        country_reviewed_in: str,
        region: AmazonRegion,
    ):
        self.author_id = author_id
        self.author_name = author_name
        self.title = title
        self.text = text
        self.date = date
        self.date_text = date_text
        self.review_id = review_id
        self.attributes = attributes
        self.verified_purchase = verified_purchase
        self.found_helpful_count = found_helpful_count
        self.is_top_positive_review = is_top_positive_review
        self.is_top_critical_review = is_top_critical_review
        self.images = images
        self.country_reviewed_in = country_reviewed_in
        self.region = region

def parse_reviews(region: AmazonRegion, product_id: str, page_limit: int = max_pages) -> list[Review]:
    result = []

    for i in range(page_limit):
        html = request_reviews(region, product_id, i)
        page = bs4.BeautifulSoup(html, features="html.parser")

        reviewElems = page.select(".review")
        if len(reviewElems) == 0:
            break

        for reviewElem in reviewElems:
            try:
                result.append(__parse_review(page, reviewElem, region))
            except ParsingError as e:
                print(e)

    return result

def __parse_review(page: bs4.element.Tag, reviewElem: bs4.element.Tag, region: AmazonRegion) -> Review:
    profile_elem = reviewElem.select_one("a.a-profile")
    profile_elem_attrs = profile_elem.attrs if profile_elem else None
    author_regex = re.search("(?<=profile\\/).+(?=\\/)", profile_elem_attrs["href"]) if profile_elem_attrs else None
    author_id = author_regex.group(0) if author_regex else None

    author_name_elem = reviewElem.select_one(".a-profile-name")
    author_name = author_name_elem.text if author_name_elem else None
    if not author_name:
        raise ParsingError("Failed to parse author name")

    author_image_elem = reviewElem.select_one(".a-profile-avatar img:not(.a-lazy-loaded)")
    author_image_url = author_image_elem.attrs["src"] if author_image_elem else None
    if not author_image_url:
        raise ParsingError("Failed to parse author image url")

    title_elem = reviewElem.select_one(".review-title")
    title = title_elem.text.strip() if title_elem else None
    if not title:
        raise ParsingError("Failed to parse title")

    text_elem = reviewElem.select_one(".review-text-content")
    text = text_elem.text.strip() if text_elem else None
    if not text:
        raise ParsingError("Failed to parse text")

    date_elem = reviewElem.select_one(".review-date")
    date_text_match = re.search("(?<=on).+", date_elem.text) if date_elem else None
    date_text = date_text_match.group(0).strip() if date_text_match else None
    if not date_text:
        raise ParsingError("Failed to parse date text")
    date_obj = parser.parse(date_text)
    date = int(date_obj.utcnow().timestamp()) if date_obj else None
    if not date:
        raise ParsingError("Failed to parse date")

    review_id = __review_id(reviewElem)

    attributes_elem = reviewElem.select_one(".review-format-strip .a-color-secondary")
    attribute_nodes = attributes_elem.findAll(string=True) if attributes_elem else None
    attributes: dict[str, str] = {}
    if attribute_nodes:
        for node in attribute_nodes:
            attribute_data = node.split(":")
            if attribute_data and len(attribute_data) == 2:
                key = attribute_data[0].strip()
                value = attribute_data[1].strip()
                if key and value:
                    attributes[key] = value

    verified_purchase_elem = reviewElem.select_one("[data-hook=\"avp-badge\"]")

    votes_elem = reviewElem.select_one(".cr-vote-text")
    votes_text = votes_elem.text if votes_elem else None
    votes = __parse_votes(votes_text) if votes_text else 0

    positive_review_elem = page.select_one(".positive-review")
    positive_review_id = __review_id(positive_review_elem) if positive_review_elem else None
    critical_review_elem = page.select_one(".critical-review")
    critical_review_id = __review_id(critical_review_elem) if critical_review_elem else None

    country_match = re.search("(?<=in ).+(?=\\s+on)", date_elem.text) if date_elem else None
    country = country_match.group(0).strip() if country_match else None
    if not country:
        raise ParsingError("Failed to parse country")

    return Review(
        author_id,
        author_name,
        title,
        text,
        date,
        date_text,
        review_id,
        attributes,
        verified_purchase_elem is not None,
        votes,
        review_id is not None and positive_review_id == review_id,
        review_id is not None and critical_review_id == review_id,
        [image.attrs["src"] for image in reviewElem.select("img.review-image-tile")],
        country,
        region
    )

def __review_id(reviewElem: bs4.element.Tag) -> str | None:
    # normal review, top review
    review_id_elem = reviewElem.select_one("a.review-title, .readMore a")
    review_id_url = review_id_elem.attrs["href"] if review_id_elem else None
    review_id_match = re.search("(?<=customer-reviews\\/).+(?=\\/)", review_id_url) if review_id_url else None
    return review_id_match.group(0) if review_id_match else None

def __parse_votes(votes_text: str) -> int:
    votes_digits = re.search("\\d+", votes_text) if votes_text else None
    if votes_digits:
        return int(votes_digits.group(0))
    elif votes_text:
        votes_number_words = re.search("\\S+", votes_text)
        votes_number_word = votes_number_words.group(0) if votes_number_words else None
        return number_words[votes_number_word.lower()] if votes_number_word else 0
    else:
        return 0

number_words = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10
}