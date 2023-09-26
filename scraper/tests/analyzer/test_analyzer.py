from requester.amazon import AmazonRegion
from parsing.amazon import Review
import analyzer.analyzer as analyzer
from datetime import datetime
import time

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
    manufacturer_name: str | None = None,
    manufacturer_id: str | None = None
) -> Review:

    print(f"Testing: Generating review w/ date {date}")
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
        manufacturer_name=manufacturer_name,
        manufacturer_id=manufacturer_id
    )

def _test_keyframes(keyframe_list, *timestamps):
    assert len(keyframe_list) == len(timestamps), "Number of keyframes does not match number of timestamps provided."
    for kf, ts in zip(keyframe_list, timestamps):
        assert kf.rel_timestamp == ts, f"Expected relative timestamp {ts} but got {kf.rel_timestamp}"

def test_process_review() -> None:
    #Exact time expressions (exact date, holiday)
    report = analyzer._process_review(produce_sample_review(
        text = "I bought this on 2023/09/10. It broke today. I will return it on Christmas 2023.", 
        date = int(datetime(2023, 9, 26).timestamp())))
    _test_keyframes(report.reliability_keyframes, 0, 16, 106)  

    #=================================================
    #Relative time expression (past, present, future) with days
    report = analyzer._process_review(produce_sample_review(
        text = "Bought three days ago. It arrived today. I will return it three days from now."))
    _test_keyframes(report.reliability_keyframes, 0, 3, 6)

    #TOFIX: the "this" in "bought this" confuses SUTime (gives a duration ISO date string with type DATE???)
    #TOFIX: "In three days" is incorrectly parsed by SUTime as a duration 
    report = analyzer._process_review(produce_sample_review(
        text = "Bought this three days ago. It arrived today. I will return it in three days."))
    #_test_keyframes(report.reliability_keyframes, 0, 3, 6)

    #Relative time expression with weeks, months and years
    report = analyzer._process_review(produce_sample_review(
        text = "Bought three years ago. It broke 5 months ago. I returned it a week ago."))
    _test_keyframes(report.reliability_keyframes, 0, 942, 1088)

    #TOFIX: ISO weeks notation parsing issue
    report = analyzer._process_review(produce_sample_review(
        text = "Bought last week. It arrived today.", 
        date = int(datetime(2023, 9, 26).timestamp())))
    #_test_keyframes(report.reliability_keyframes, 0, 7)

    #=================================================
    #Present reference
    report = analyzer._process_review(produce_sample_review(
        text = "Bought this earlier today. It arrived now."))
    _test_keyframes(report.reliability_keyframes, 0, 0)

    #Not supported: Indeterminate past & future references
    report = analyzer._process_review(produce_sample_review(
        text = "Bought this in the past. Will return it in the future."))
    _test_keyframes(report.reliability_keyframes)

    #Not supported: Periodic expressions (duration/set)
    report = analyzer._process_review(produce_sample_review(
        text = "It breaks every week. It's been like this for 6 months."))
    _test_keyframes(report.reliability_keyframes)
    
    #Filtered: keyframes irrelevant to product ownership
    report = analyzer._process_review(produce_sample_review(
        text = "My dog ate my python homework 2 days ago."))
    _test_keyframes(report.reliability_keyframes)