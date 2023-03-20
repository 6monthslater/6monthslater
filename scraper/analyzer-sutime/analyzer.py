from dataclasses import dataclass
from typing import List, Tuple, Optional
import spacy
from spacy.tokens import Doc, Token, Span
from spacy.matcher import Matcher
from spacy.symbols import xcomp
import re
from spacytextblob.spacytextblob import SpacyTextBlob
from amazon import Review
from datetime import datetime
import dateparser
import json
from sutime import SUTime
import os

nlp = spacy.load("en_core_web_sm")
nlp.add_pipe('spacytextblob')

sutime = SUTime(mark_time_ranges=True, include_range=True, jars=os.path.join(os.path.dirname(__file__), 'jars'))

@dataclass
class Keyframe:
    rel_timestamp: int
    sentiment: float
    interp: Optional[str] = None

@dataclass
class Issue:
    text: str
    summary: Optional[str]
    criticality: Optional[float]
    rel_timestamp: Optional[int]
    frequency: Optional[str]
    image: Optional[str]
    resolution: Optional[str]

@dataclass
class Report:
    review_id: int
    report_weight: float
    reliability_keyframes: List[Keyframe]
    issues: List[Issue]
    


def extract_keyframes(review_text_doc: Doc, review_date: datetime) -> List[Keyframe]:
    '''
    Returns a list of ownership-relevant keyframes, sorted by time relative to first keyframe (assumed to be date of sale).
    TODO before pushing: Relative time matching, exact time matching, filtering, earliest date calc, creation of keyframes and sorting
    TODO later: Testing; more time matching: vagueness, time of day, ordinals, comparatives, special events & periodic occurances
    
    Approach:
    Extract relative and exact date expressions
    Filter them based on relevance to product ownership
    Find the earliest relevant time expression and set that as our reference point (date of sale)
    Go through relevant time expressions and create keyframes for each containing:
       - Time passed since reference point in days
       - Sentiment of associated sentence
       
    Sort keyframes based on relative time
        Parameters:
            review_text_doc (Doc): spaCy document object
            
        Returns: 
            result (List[Keyframe]): Sorted keyframes
   '''
       
    #1. Extract relative and exact date expressions (relative to review post date)
    time_expression_data = []
    

    print("")
    print("============================")
    print("Text: " + review_text_doc.text)
    print("Date: " + review_date.strftime('%Y-%m-%d'))
    #for time_expression in time_expression_data:
    #    print(time_expression[0] + " : " + str(time_expression[1]) + " (" + time_expression[2] + ")")
    print(json.dumps(sutime.parse(review_text_doc.text, str(review_date)), sort_keys=True, indent=4))
       
    
    #2. Filter them based on relevance to product ownership
    
    #3. Find the earliest relevant time expression and set that as our reference point (date of sale)

    
    return None


def extract_issues(review_text_doc) -> List[Issue]:
    # Placeholder implementation
    return []


def process_reviews(reviews: List[Review]) -> List[Report]:
    result = []

    for review in reviews:
        doc = nlp(review.text)
        result.append(Report(review.review_id, 1, extract_keyframes(doc), extract_issues(doc)))

    return result

def extract_relevant_phrase(ent: Span) -> str:
    governing_verb = None
    token = ent.root

    while token.head != token:
        if token.head.pos_ == 'VERB' and token.head.dep != xcomp: #accounts for composite verbs
            governing_verb = token.head
            break
        token = token.head

    #print("Governing verb for " + str(ent) + " : " + str(governing_verb) + " (head: " + str(governing_verb.head) + ", rel: " + governing_verb.dep_+ ")")

    if governing_verb is not None:
        rel_phrase = []
        for t in governing_verb.subtree:
            #print("Related token: " + str(t) + ", selected: " + str(t.i < ent.start))
            if t.i < ent.start:
                rel_phrase.append(t)
            else:
                break
                
        return ''.join(t.text + t.whitespace_ for t in rel_phrase).strip()
    else:
        return ent.sent.text

extract_keyframes(nlp("I bought this product a week ago and it broke yesterday. I was really disappointed."), datetime(2023, 3, 10))
extract_keyframes(nlp("I got this last month, and it's been working great ever since."), datetime(2023, 2, 20))
extract_keyframes(nlp("I've had this item for 6 months now, and it's still going strong."), datetime(2023, 3, 15))
extract_keyframes(nlp("Bought it two years ago, and it's never given me any problems. Highly recommend!"), datetime(2023, 3, 17))
extract_keyframes(nlp("It arrived on March 1st and stopped working on March 10th. Terrible quality!"), datetime(2023, 3, 17))
extract_keyframes(nlp("Purchased this item in January 2022, and it's been fantastic so far."), datetime(2023, 1, 25))
extract_keyframes(nlp("I got it as a gift on Christmas 2022, and I've been using it daily since."), datetime(2023, 3, 10))

extract_keyframes(nlp("It arrived on March 1st, 2020 and stopped working on APRIL 5. Terrible quality!"), datetime(2023, 3, 17))
extract_keyframes(nlp("It arrived on Mar 1st and stopped working on Apr 5. Terrible quality!"), datetime(2023, 3, 17))
extract_keyframes(nlp("It arrived in mid-August and stopped working in late December. Terrible quality!"), datetime(2023, 3, 17))


