import datetime

class Review:
    author_id: str
    author_name: str
    text: str
    date: datetime.datetime
    date_text: str

    def __init__(
        self,
        author_id: str,
        author_name: str,
        text: str,
        date: datetime.datetime,
        date_text: str,
    ):
        self.author_id = author_id
        self.author_name = author_name
        self.text = text
        self.date = date
        self.date_text = date_text

def parse_reviews(product_id: str) -> list[Review]:
    return [
        Review(
            "test",
            "test",
            "test",
            datetime.datetime.now(),
            "test",
        )
    ]