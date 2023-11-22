from datetime import datetime, timezone
import time

from parameterized import parameterized

import analyzer.analyzer as analyzer
from requester.amazon import AmazonRegion
from parsing.amazon import Review

def produce_sample_review(
    author_id: str | None = "",
    author_name: str = "",
    author_image_url: str = "",
    title: str = "",
    text: str = "",
    date: int = int(time.time()),
    date_text: str = "",
    review_id: str = "Sample",
    attributes: dict[str, str] = {},
    verified_purchase: bool = False,
    found_helpful_count: int = 0,
    is_top_positive_review: bool = False,
    is_top_critical_review: bool = False,
    images: list[str] = [],
    country_reviewed_in: str = "Canada",
    region: AmazonRegion = AmazonRegion.CA,
    product_name: str | None = None,
    product_image_url: str | None = None,
    manufacturer_name: str | None = None,
    manufacturer_id: str | None = None
) -> Review:
    return Review(
        author_id=author_id,
        author_name=author_name,
        author_image_url=author_image_url,
        title=title,
        text=text,
        date=date,
        date_text=date_text,
        review_id=review_id,
        attributes=attributes,
        verified_purchase=verified_purchase,
        found_helpful_count=found_helpful_count,
        is_top_positive_review=is_top_positive_review,
        is_top_critical_review=is_top_critical_review,
        images=images,
        country_reviewed_in=country_reviewed_in,
        region=region,
        product_name=product_name,
        product_image_url=product_image_url,
        manufacturer_name=manufacturer_name,
        manufacturer_id=manufacturer_id
    )

@parameterized.expand([
    ("exact_date_holiday", #Exact time expressions (exact date, holiday)
        produce_sample_review(
            text = "I bought this on 2023/09/10. It broke today. I will return it on Christmas 2023.",
            date = int(datetime(2023, 9, 26).timestamp())),
        [0, 16, 106]),

    ("relative_date_days", #Relative time expression (past, present, future) with days
        produce_sample_review(
            text = "Bought three days ago. It arrived today. I will return it three days from now."),
        [0, 3, 6]),

    #TOFIX: the "this" in "bought this" confuses SUTime (gives a duration ISO date string with type DATE???)
    #TOFIX: "In three days" is incorrectly parsed by SUTime as a duration
    #("relative_date_days_sutime_fails", 
    #    produce_sample_review(
    #        text = "Bought this three days ago. It arrived today. I will return it in three days."),
    #    [0, 3, 6]),

    ("relative_date_week_month_years", #Relative time expression with weeks, months and years
        produce_sample_review(
            text = "Bought three years ago. It broke 5 months ago. I returned it a week ago."),
        [0, 942, 1088]),

    ("relative_date_iso_week_notation", #ISO 8601 year-week notation support
        produce_sample_review(
            text = "Bought last week. It arrived this week. It broke today"),
        [0, 7, 7 + datetime.now(timezone.utc).weekday()]),

    #TOFIX: how we handle years and "start"/"end"
    #("relative_date_start_end",
    #    produce_sample_review(
    #        text = "Bought in 2022. It arived at the start of this year. It broke at the end of last week.",
    #        date = int(datetime(2023, 9, 26).timestamp())),
    #    [0, 365, tocalculate]),

    ("present_ref", #Present reference
        produce_sample_review(
            text = "Bought this earlier today. It arrived now."),
        [0, 0]),

    ("past_future_refs_filtered", #Not supported: Indeterminate past & future references
        produce_sample_review(
            text = "Bought this in the past. Will return it in the future."),
        []),

    ("periodics_filtered", #Not supported: Periodic expressions (duration/set)
        produce_sample_review(
            text = "It crashes every week. It's been like this for 6 months."),
        []),

    ("filter_relevance", #Filtered: keyframes irrelevant to product ownership
        produce_sample_review(
            text = "My dog ate my python homework 2 days ago."),
        []),

    #TOFIX: handling INTERSECT smartly
    #("intersections",
    #    produce_sample_review(
    #        text = "Bought on the week of October 2nd 2019. Got it on the week of Christmas 2019"),
    #    [tocalculate]),

    ("misc_timezones", #Misc: specifying a timezone
        produce_sample_review(
            text = "Bought on September 24th at midnight CET. It arrived today.",  #aka 11pm UTC previous day
            date = int(datetime(2023, 9, 26).timestamp())),
        [0, 3]),

    ("misc_token_boundaries_left", #Misc: fix for sutime not returning correct token boundaries when symbols are involved
        produce_sample_review(
            text = "Bought it on |September 24th at midnight"),
        [0]),

    ("misc_token_boundaries_right",
        produce_sample_review(
            text = "Bought it on September 24th at midnight|"),
        [0]),
])
def test_extract_keyframes(name: str, review: Review, timestamps: list[int]):
    print(f"Testing: Processing review w/ date {review.date}")
    print(f"Testing: \"{review.text}\"")

    keyframe_list = analyzer._process_review(review).reliability_keyframes

    assert len(keyframe_list) == len(timestamps), f"Expected {len(timestamps)} keyframes but got {len(keyframe_list)}"
    for kf, ts in zip(keyframe_list, timestamps):
        assert kf.rel_timestamp == ts, f"Expected relative timestamp {ts} but got {kf.rel_timestamp}"