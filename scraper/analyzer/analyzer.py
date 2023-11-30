#analyzer.py: Main script of the analyzer module. 
#See README.md and docstrings/comments for more information.
from dataclasses import dataclass
from datetime import datetime, timezone
from dateutil.parser import isoparse
from typing import Tuple, Optional, Any
import os

import spacy
from spacy.tokens import Doc, Token, Span
from spacy.symbols import xcomp, ccomp, aux
from textblob.classifiers import NaiveBayesClassifier
from sutime import SUTime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from analyzer.issues import criticalities
from parsing.amazon import Review
from utils.env import get_env

# Large EN model has word vectors and a bunch of goodies, but maybe slightly slower.
# You can swap the uncommented and commented lines below to test performance with both.
_nlp = spacy.load("en_core_web_lg")
#_nlp = spacy.load("en_core_web_sm")

#Trains classifiers for:
#Relevance of clause to product ownership experience
with open('analyzer/train_relevance.json', 'r') as fp:
    _cl_relevance = NaiveBayesClassifier(fp, format="json")

#Relevance of clause to experience of an issue
with open('analyzer/train_issue_detection.json', 'r') as fp:
    _cl_issue_detect = NaiveBayesClassifier(fp, format="json")

# Classifying an issue
with open('analyzer/train_issue_class.json', 'r', encoding='utf-8') as fp:
    _cl_issue_class = NaiveBayesClassifier(fp, format="json")

_sent_analyzer = SentimentIntensityAnalyzer() #VADER library
_sutime = SUTime(mark_time_ranges=True, include_range=True, jars=os.path.join(os.path.dirname(__file__), 'jars'))
_debug = get_env("DEBUG") in ["1", "True", "true"]
_THRESHOLD_OWNERSHIP_REL = float(get_env("ANALYZER_THRESHOLD_OWNERSHIP_REL"))
_THRESHOLD_ISSUE_REL = float(get_env("ANALYZER_THRESHOLD_ISSUE_REL"))
_THRESHOLD_ISSUE_CLASS = float(get_env("ANALYZER_THRESHOLD_ISSUE_CLASS"))
_THRESHOLD_CCOMP_MAX_DIST = 25
_punct_whitelist = ['(', ')', '“', '”', '"', '\'']
_debug_clause_tracker = []

@dataclass
class Keyframe:
    rel_timestamp: int
    text: str
    time_start: int
    time_end: int
    sentiment: float
    interp: Optional[str] = None

@dataclass
class Issue:
    text: str
    classification: Optional[str]
    criticality: Optional[float]
    rel_timestamp: Optional[int]
    frequency: Optional[str]
    image: Optional[str]
    resolution: Optional[str]

@dataclass
class Report:
    review_id: str
    report_weight: float
    reliability_keyframes: list[Keyframe]
    issues: list[Issue]

    def __str__(self):
        '''
        Fancy printing method.
        '''
        result = f"REPORT FOR REVIEW #{self.review_id} (weight: {self.report_weight})\n"
        result += "Keyframes:\n"

        for keyframe in self.reliability_keyframes:
            result += f"• Keyframe: {keyframe.text} (rel. timestamp: {keyframe.rel_timestamp}, sentiment: {keyframe.sentiment})\n"

        if len(self.issues) > 0:
            result += "Issues:\n"

            for issue in self.issues:
                result += f"• Issue: {issue.text} (classification: {issue.classification}, criticality: {issue.criticality}, "
                result += f"rel. timestamp: {issue.rel_timestamp})\n"

        return result

def _extract_keyframes(clauses: list[Span], review_text_doc: Doc, review_date: int) -> list[Keyframe]:
    '''
    Returns a list of ownership-relevant keyframes, sorted by time relative to first keyframe (assumed to be date of sale).

    Approach:
    Extract relative and exact date expressions
    Filter them based on relevance to product ownership
    Find the earliest relevant time expression and set that as our reference point (date of sale)
    Go through relevant time expressions and create keyframes for each containing:
       - Time passed since reference point in days
       - Sentiment of associated sentence
    Sort keyframes based on relative time

        Parameters:
            clauses (list[Span]): extracted document clauses
            review_text_doc (Doc): spaCy document object
            review_date (int): the review date as a UTC timestamp

        Returns:
            keyframes (list[Keyframe]): Sorted keyframes
    '''

    keyframes = []

    #1. Extract relative and exact date expressions (relative to review post date)
    time_expressions: Any = []
    parse_results = _sutime.parse(review_text_doc.text, str(datetime.utcfromtimestamp(review_date)))

    for result in parse_results:
        if _debug:
            print(f"DEBUG | Type {result['type']} | Value {result['value']}")

        # TODO: Support for other time expression categories, e.g. periodic
        if result['type'] in ['DATE', 'TIME'] and result['value'] not in ['PAST_REF', 'FUTURE_REF']:
            try:
                if _debug:
                    print(f"DEBUG | Parsing date '{result['value']}'")

                relative_date = isoparse(str(result['value'])).astimezone(timezone.utc)
            except ValueError:
                if result['value'] != 'PRESENT_REF':
                    print(f"WARNING: Failed to parse expression '{result['value']}' from SUTime result; defaulting to review date.")
                relative_date = datetime.utcfromtimestamp(review_date)
            except OSError:
                # SUTime sometimes parses a number from review text as a time expression when it shouldn't
                # If this happens, isoparse will yield an "OSError: Invalid argument" on Windows
                continue # Skip false-positives from SUTime

            if _debug:
                print(f"DEBUG | Type {result['type']} | Value {result['value']} => Parsed {relative_date}")

            #ensuring start and end offset correspond to document token boundaries
            token_start = result['start'] #default if adjustment fails, may lead to None time_expression_span
            prev_whitespace = 0
            for t in review_text_doc:
                if t.idx - prev_whitespace <= result['start'] < t.idx + len(t.text):
                    token_start = t.idx
                    break
                prev_whitespace = len(t.whitespace_)

            token_end = next(t.idx + len(t.text) for t in review_text_doc if t.idx <= result['end']-1 < t.idx + len(t.text_with_ws))

            # Find relevant clause & filter out time expr
            time_expression_span = review_text_doc.char_span(token_start, token_end)
            relevant_phrase = None

            for clause in clauses:
                if time_expression_span.text in clause.text:
                    rel_phrase = []

                    for t in clause: # Copy clause but exclude the time expression itself
                        if t.i < time_expression_span.start or t.i >= time_expression_span.end:
                            rel_phrase.append(t)

                    # Exclude leading punctuation and conjunctions
                    while rel_phrase[0].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
                        rel_phrase.pop(0)

                    # Exclude trailing punctuation and conjunctions
                    while rel_phrase[-1].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
                        rel_phrase.pop()

                    relevant_phrase = ''.join(t.text + t.whitespace_ for t in rel_phrase).strip()
                    break

            if not relevant_phrase:
                relevant_phrase = time_expression_span.sent.text

            # Filter them based on relevance to product ownership (90% should be a very reasonable threshold with few false negatives)
            relevance_to_ownership_exp = _cl_relevance.prob_classify(relevant_phrase).prob("relevant")

            if relevance_to_ownership_exp >= _THRESHOLD_OWNERSHIP_REL:
                time_expressions.append((relative_date.date(), relevant_phrase, time_expression_span))
                if _debug:
                    print(f"DEBUG | Time expression: {time_expressions[-1]}")
            else:
                print(f"WARNING: Filtered expression '{relevant_phrase}' based on relevance to "
                    f"ownership experience (prob = {relevance_to_ownership_exp:.2f})")

        if _debug:
            print("DEBUG | ---")

    # 2. Find the earliest time expression and set that as our reference point (date of sale)
    ref_date = datetime.utcfromtimestamp(review_date).date()
    for time_expression in time_expressions:
        if time_expression[0] <= ref_date:
            ref_date = time_expression[0]

    #3. Create keyframes
    for time_expression in time_expressions:
        keyframes.append(Keyframe(rel_timestamp = (time_expression[0] - ref_date).days,
                                  text = time_expression[1],
                                  time_start = time_expression[2].start,
                                  time_end = time_expression[2].end,
                                  sentiment = round((_sent_analyzer.polarity_scores(time_expression[1])['compound']+1)/2, 2),
                                  interp = None)) # TODO: Keyframe interpolation

    # TODO: Add sentiment from potentially related but independent clauses! (e.g. "(...) on March 12th. Terrible quality!")

    #4. Return keyframes sorted by time
    return sorted(keyframes, key = lambda k: k.rel_timestamp)

def _extract_issues(doc_clauses: list[Span], keyframes: list[Keyframe]) -> list[Issue]:
    '''
    Returns a list of issues with the product.

    Approach:
    Iterate through list of independent clauses in the review
    Use classifier to detect issue-relevant clauses
    Use classifier to determine issue class
    Iterate through issue-relevant clauses and merge those that relate to the same issue
    Create and return issues list

        Parameters:
            doc_clauses (list[Span]): List of independent document clauses
            keyframes (list[Keyframe]): List of keyframes to relate issues to

        Returns:
            issues (list[Issue]): Product issues
    '''

    # 1. Find clauses that describe issues
    issue_clauses: list[Tuple[Span, str]] = []
    for clause in doc_clauses:
        prob_dist = _cl_issue_class.prob_classify(clause.text)
        class_probabilities = [(sample, prob_dist.prob(sample)) for sample in prob_dist.samples()]
        class_probabilities.sort(key=lambda x: x[1], reverse=True)
        found_via_class = False

        for class_probability in class_probabilities:
            if class_probability[0] != "UNKNOWN_ISSUE" and class_probability[1] > _THRESHOLD_ISSUE_CLASS:
                issue_clauses.append((clause, class_probability[0]))
                found_via_class = True
                print(f"FOUND ISSUE w/ CLASS: {clause.text} => {class_probability[0]}, p: {class_probability[1]}")
                break

        if not found_via_class and _cl_issue_detect.prob_classify(clause.text).prob("is_issue") >= 0.9:
            issue_clauses.append((clause, "UNKNOWN_ISSUE"))
            print(f"FOUND ISSUE: {clause.text}")

    # 2. Iterate through clauses and create/merge issues
    temp_issues: dict[Tuple[str, Optional[int]], Issue] = {}
    for issue_clause in issue_clauses:
        cur_rel_timestamp = None

        #Get issue timestamp from contained keyframe time expression if applicable
        for keyframe in keyframes:
            if keyframe.time_start >= issue_clause[0].start and keyframe.time_end <= issue_clause[0].end:
                cur_rel_timestamp = keyframe.rel_timestamp
                break

        issue_key = (issue_clause[1], cur_rel_timestamp)

        # Merge issues with the same class and timestamp
        if issue_key[1] is not None and issue_key in temp_issues:
            temp_issues[issue_key].text += " | " + issue_clause[0].text

        else:
            temp_issues[issue_key] = Issue(text = issue_clause[0].text,
                                           classification = issue_clause[1],
                                           criticality = criticalities[issue_clause[1]] if issue_clause[1] in criticalities else 0.5,
                                           rel_timestamp = cur_rel_timestamp,
                                           frequency = None,
                                           image = None,
                                           resolution = None)

    return list(temp_issues.values())

def _get_governing_verb(t: Token) -> Token | None:
    '''
    Returns verb token which governs the given token's clause, if available.
    Walks through the head tokens (parents) of t until a verb (/root of a composite verb) is found.
    Only the root verb in a composite verb (e.g. "stopped" in "stopped working") actually governs the sentence.

        Parameters:
            t (Token): spaCy token object

        Returns:
            governing_verb (Token): spaCy token object for governing verb
    '''
    governing_verb = None

    while t.head != t:
        # xcomp accounts for composite verbs (e.g. "stopped working")
        if t.head.pos_ in ['VERB', 'AUX'] and t.head.dep != xcomp:
            governing_verb = t.head
            break
        t = t.head

    return governing_verb

def _extract_clauses(doc: Doc) -> list[Span]:
    '''
    Returns list of all independent clauses in a given document.

    Approach:
    For every verb in the document, determines span bounds of clause, excluding sub-clauses, and adds it to list.
    For every sentence lacking a verb, determines span bounds of non-verbal clause and adds it to list.
    Filters verbal clauses from the list if their governing verb is contained within another clause.
    Sorts list to ensure text order is respected.
    Merges clauses which are connected by a SCONJ token.

        Parameters:
            doc (Doc): spaCy document object

        Returns:
            final_clauses (list[Span]): List of independent clauses
    '''
    clauses: list[Tuple[Span, Optional[Token]]] = []

    # Iterates document verbs
    for verb in doc:
        if verb.pos_ in ['VERB', 'AUX']:
            start = None
            end = None

            # Determines clause boundaries from subtree tokens
            for t in verb.subtree:
                in_current_clause = False

                # Include if IS or IS GOVERNED BY the governing verb or any verb clausally related to it
                cur_verb = t if t.pos_ in ['VERB', 'AUX'] else _get_governing_verb(t)
                if cur_verb:
                    head_dist = abs(cur_verb.i - cur_verb.head.i)

                    if cur_verb == verb:
                        in_current_clause = True
                    if cur_verb.head == verb and cur_verb.dep in [ccomp, xcomp, aux] and head_dist <= _THRESHOLD_CCOMP_MAX_DIST:
                        in_current_clause = True

                # Exclude leading/trailing punctuation and conjunctions
                if in_current_clause and t.pos_ != 'CCONJ' and (t.pos_ != 'PUNCT' or t.text in _punct_whitelist):
                    if start is None:
                        start = t.i

                    end = t.i + 1

            if start is not None and end is not None:
                if doc[start-1].pos_ == 'CCONJ':
                    clauses.append((doc[start-1:end], verb))
                else:
                    clauses.append((doc[start:end], verb))

    # Non-verbal clauses
    for sent in doc.sents:
        if not any(token.pos_ in ['VERB', 'AUX'] for token in sent):
            start = None
            end = None

            for t in sent:
                if t.pos_ != 'CCONJ' and (t.pos_ != 'PUNCT' or t.text in _punct_whitelist):
                    if start is None:
                        start = t.i

                    end = t.i + 1

            if start is not None and end is not None:
                clauses.append((doc[start:end], None))

    # Filters clauses whose governing verb is contained in other clauses
    filtered_clauses = sorted([
        span1[0] for span1 in clauses
        if span1[1] is None or not any(
            span1 != span2 and any(t == span1[1] for t in span2[0]) for span2 in clauses
        )
    ], key=lambda span: span.start)

    # Merges clauses related by an SCONJ & orphans
    final_clauses: list[Span] = []
    for i, clause in enumerate(filtered_clauses):
        if i > 0 and ((clause[0].pos_ == 'SCONJ' and clause[0].i - final_clauses[-1][-1].i == 1) or (clause[-1].i == clause[0].i)):
            merged_clause = doc[final_clauses[-1][0].i : clause[-1].i + 1]
            final_clauses[-1] = merged_clause

        else:
            final_clauses.append(clause)

    if _debug:
        print(f"DEBUG | clauses: {final_clauses}")

    return final_clauses

def _process_review(review: Review) -> Report:
    '''
    Private method to process a review and generate an actionable report.
    Calls upon private methods to extract clauses, keyframes and issues from the review text.

        Parameters:
            review (Review): review to process

        Returns:
            report (Report): resulting report
    '''
    doc = _nlp(review.text)
    clauses = _extract_clauses(doc)
    if _debug:
        global _debug_clause_tracker
        _debug_clause_tracker.extend([f'{clause.text}' for clause in clauses])
        with open('clause_tracker.txt', 'w', encoding='utf-8') as file:
            file.write(str(_debug_clause_tracker))


    keyframes = _extract_keyframes(clauses, doc, review.date)
    issues = _extract_issues(clauses, keyframes)

    return Report(
            review_id = review.review_id,
            report_weight = 1, # TODO: Report weighing
            reliability_keyframes = keyframes,
            issues = issues)

def process_reviews(reviews: list[Review]) -> list[Report]:
    '''
    Public method to process a set of reviews.
    Calls upon private worker method _process_review.

        Parameters:
            reviews (list[Review]): list of reviews to process

        Returns:
            reports (list[Report]): list of generated reports
    '''
    return [_process_review(review) for review in reviews]