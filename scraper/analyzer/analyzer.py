from dataclasses import dataclass
from parsing.amazon import Review
import spacy
from spacy.matcher import Matcher
from collections import namedtuple

nlp = spacy.load("en_core_web_sm")
keyframe_patterns = []  # TODO
issue_patterns = []     # TODO

Keyframe = namedtuple('Keyframe', 'rel_timestamp sentiment interp')  # TODO: hard typing, probably convert
Issue = namedtuple('Issue', 'text summary criticality rel_timestamp frequency image')  # to data classes


@dataclass
class Report:
    review_id: int
    report_weight: float
    reliability_keyframes: list[Keyframe]
    issues: list[Issue]


def extract_keyframes(review_text_doc) -> list[Keyframe]:
    matcher = Matcher(nlp.vocab)

    # TODO: Additional research needed to find the best possible patterns to match keyframes...
    # (I have some ideas, but not sure yet)
    # Docs: https://spacy.io/api/matcher

    for i, pattern in enumerate(keyframe_patterns):
        matcher.add("KEYFRAME_PATTERN_{}".format(i), None, pattern)

    matches = matcher(review_text_doc)

    result = []

    for match in matches:
        matched_text = review_text_doc[match.start:match.end]
        # TODO: Conversion of matched timestamp to number, additional processing to get other issue attributes
        result.append(Keyframe(matched_text, None, None))

    return result


def extract_issues(review_text_doc) -> list[Issue]:
    matcher = Matcher(nlp.vocab)

    # TODO: Additional research needed to find the best possible patterns to match issues...
    # (I have some ideas, but not sure yet)
    # Docs: https://spacy.io/api/matcher

    for i, pattern in enumerate(issue_patterns):
        matcher.add("ISSUE_PATTERN_{}".format(i), None, pattern)

    matches = matcher(review_text_doc)

    result = []

    for match in matches:
        matched_text = review_text_doc[match.start:match.end]
        # TODO: Additional processing + generation to get other issue attributes
        result.append(Issue(matched_text, None, None, None, None, None))

    return result


def process_reviews(reviews: list[Review]) -> list[Report]:
    result = []

    for review in reviews:
        # TODO: Issue correlation and a bunch of other stuff (see 'report object draft.txt' for goals)

        doc = nlp(review.text)
        result.append(Report(review.review_id, 1, extract_keyframes(doc), extract_issues(doc)))

    return result
