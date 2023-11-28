from datetime import datetime, timezone
from typing import Optional
import time
import spacy

from parameterized import parameterized

import analyzer.analyzer as analyzer
from requester.amazon import AmazonRegion
from parsing.amazon import Review

nlp = spacy.load("en_core_web_sm")

# Split to avoid line length warnings
mouse_example = "I have tried a lot of gaming mice. A lot. The shape of the original Deathadder was miles ahead for comfort, but it was enormous and I have"
mouse_example += " small hands. I did a circuit of popular smaller mice and heard of this, instant buy from me. Scroll wheel is solid, side buttons are"
mouse_example += " clicky. The left/right clicks are a little sensitive/soft (too much so) which takes some getting used to, but overall build quality is"
mouse_example += " solid enough. The included grip tape is high quality and the cable lies mostly flat, which is nice if you don't want to paracord your"
mouse_example += " mouse.This isn't the fanciest gaming mouse, it isn't wireless, doesn't have crazy dpi settings, and it looks very 'Razer', which may not"
mouse_example += " be to your taste. But it works really well, and the intense thumb pain that I had using very popular mice like the gpw is gone."

hdd_example = "Complete trash. I used it to transfer confidential documents from my laptop and while it worked well for"
hdd_example += " a day it suddenly decided to stop working and all my computers can’t even read it anymore. The kicker"
hdd_example += " is I can’t return it because I’m unable to delete the files and I don’t want to put them out there in"
hdd_example += " case someone else can recover them. Bottom line - Don’t try to save money by buying this piece of junk"
hdd_example += " and go with a more reputable brand."

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

    ("morning_night_ref",
        produce_sample_review(
            text = "Bought it yesterday. It arrived this morning. I'll review it tonight."),
        [0, 1, 1]),

    ("past_future_refs_filtered", # Not supported: Indeterminate past & future references
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
    print(f"Testing: Processing review w/ date {review.date} for keyframes")
    print(f"Testing: \"{review.text}\"")

    keyframe_list = analyzer._process_review(review).reliability_keyframes

    assert len(keyframe_list) == len(timestamps), f"Expected {len(timestamps)} keyframes but got {len(keyframe_list)}"
    for kf, ts in zip(keyframe_list, timestamps):
        assert kf.rel_timestamp == ts, f"Expected relative timestamp {ts} but got {kf.rel_timestamp}"

#===============================
#===============================
#===============================

@parameterized.expand([
    ("no_issues",
        produce_sample_review(
            text = mouse_example),
        []),
    ("issues",
        produce_sample_review(
            text = hdd_example),
        ['System Inoperable']),
])
def test_extract_issues(name: str, review: Review, issue_classes: list[Optional[str]]):
    print("Testing: Processing review for issues")
    print(f"Testing: \"{review.text}\"")

    issue_list = analyzer._process_review(review).issues

    for issue in issue_list:
        print(f"{issue.classification}: {issue.text}")

    assert len(issue_list) == len(issue_classes), f"Expected {len(issue_classes)} issues but got {len(issue_list)}"
    for issue, isc in zip(issue_list, issue_classes):
        assert str(issue.classification).strip().lower() == str(isc).strip().lower(), f"Expected issue class {isc} but got {issue.classification}"

#===============================
#===============================
#===============================

@parameterized.expand([
    ("mouse_example", mouse_example, 20),
    ("hdd_example", hdd_example, 11),
])
def test_extract_clauses(name: str, review_text: str, clauses_len: int):
    print("Testing: Processing review for clauses")
    print(f"Testing: \"{review_text}\"")

    clause_list = analyzer._extract_clauses(nlp(review_text))
    for clause in clause_list:
        print(clause.text)

    assert len(clause_list) == clauses_len, f"Expected {clauses_len} clauses but got {len(clause_list)}"