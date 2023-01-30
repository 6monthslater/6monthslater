from ...parsing import amazon

def test_parse_reviews() -> None:
    assert amazon.parse_reviews("test")[0].author_id == "test"