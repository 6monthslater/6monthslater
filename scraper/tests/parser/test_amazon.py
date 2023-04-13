from requester.amazon import AmazonRegion
from parsing import amazon

def test_parse_reviews() -> None:
    reviews = amazon.parse_reviews(AmazonRegion.CA, "B08B3K9K6P", 5)

    # TODO: Uncomment. For now it is only fetching 10 reviews
    # assert len(reviews) > 10
    assert len(reviews[0].author_name) > 0
    assert len(reviews[0].title) > 0
    assert len(reviews[0].text) > 0
    assert reviews[0].date is not None
    assert len(reviews[0].date_text) > 0
    assert reviews[0].review_id is not None
    assert len(reviews[0].attributes) >= 4
    assert reviews[0].verified_purchase
    assert sum(1 for review in reviews if review.is_top_positive_review) == 1
    assert sum(1 for review in reviews if review.is_top_critical_review) == 1
    assert any(len(review.images) > 0 and len(review.images[0]) > 0 for review in reviews) > 0
    assert any(review.country_reviewed_in for review in reviews) > 0
    assert reviews[0].region == AmazonRegion.CA

def test_parse_votes_number() -> None:
    assert amazon.__parse_votes("2 people found this helpful") == 2 # pyright: ignore

def test_parse_votes_word() -> None:
    assert amazon.__parse_votes("One person found this helpful") == 1 # pyright: ignore