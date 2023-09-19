from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import typing
import spacy
from spacy.tokens import Doc, Token, Span
from spacy.symbols import xcomp
from textblob.classifiers import NaiveBayesClassifier 
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sutime import SUTime
from analyzer.issues import criticalities
import os
import dateparser

from parsing.amazon import Review

# TODO: Private fields

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
    
#Classifying an issue
with open('analyzer/train_issue_class.json', 'r') as fp:
    _cl_issue_class = NaiveBayesClassifier(fp, format="json")

_sent_analyzer = SentimentIntensityAnalyzer() #VADER library
_sutime = SUTime(mark_time_ranges=True, include_range=True, jars=os.path.join(os.path.dirname(__file__), 'jars'))


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
    reliability_keyframes: List[Keyframe]
    issues: List[Issue]    


def _extract_keyframes(review_text_doc: Doc, doc_clauses: List[Span], review_date: int) -> List[Keyframe]:
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
            review_text_doc (Doc): spaCy document object
            
        Returns: 
            keyframes (List[Keyframe]): Sorted keyframes
    '''
    
    keyframes = []
       
    #1. Extract relative and exact date expressions (relative to review post date)
    time_expressions: typing.Any = []
    parse_results = _sutime.parse(review_text_doc.text, str(review_date))
    
    # Debug prints used to generate cache.py
    #print("cache = " + json.dumps(parse_results))
    #print()
       
    for result in parse_results:
        if result['type'] in ['DATE', 'TIME']: # TODO: Support for other time expression categories, e.g. periodic
            # TODO: Handle "PAST_REF" and "THIS P1D" in a different way from "PRESENT_REF" https://github.com/stanfordnlp/CoreNLP/blob/b5a632c8de4b05d95bb95b35a5042ae38e3ab921/src/edu/stanford/nlp/time/SUTime.java#L705
            parsed_date = dateparser.parse(typing.cast(str, result['value']))
            relative_date = datetime.utcfromtimestamp(review_date) if parsed_date is None else parsed_date
            time_expression_span = review_text_doc.char_span(typing.cast(int, result['start']), typing.cast(int, result['end']))
            relevant_phrase = _extract_relevant_phrase(time_expression_span)

            #Filter them based on relevance to product ownership (90% should be a very reasonable threshold with few false negatives)
            relevance_to_ownership_exp = _cl_relevance.prob_classify(relevant_phrase).prob("relevant")
            
            if relevance_to_ownership_exp >= 0.9: 
                time_expressions.append((relative_date, relevant_phrase, time_expression_span))
            else:
                print("DEBUG: Filtered expression '" + relevant_phrase + "' based on relevance to ownership experience (prob = " +
                    "{:.2f}".format(relevance_to_ownership_exp) + ")")
            
    #2. Find the earliest time expression and set that as our reference point (date of sale)
    ref_date = datetime.utcfromtimestamp(review_date)
    for time_expression in time_expressions:
        if time_expression[0] <= ref_date:
            ref_date = time_expression[0]
                
    #3. Create keyframes
    for time_expression in time_expressions:
        keyframes.append(Keyframe(rel_timestamp = (time_expression[0] - ref_date).days, 
                                  text = time_expression[1],
                                  time_start = time_expression[2].start,
                                  time_end = time_expression[2].end,
                                  sentiment = (_sent_analyzer.polarity_scores(time_expression[1])['compound']+1)/2, 
                                  interp = None)) # TODO: Keyframe interpolation
    
    # TODO: Add sentiment from potentially related but independent clauses! (e.g. "(...) on March 12th. Terrible quality!")
    
    #4. Return keyframes sorted by time
    return sorted(keyframes, key = lambda k: k.rel_timestamp)


def _extract_issues(review_text_doc: Doc, doc_clauses: List[Span], keyframes: List[Keyframe]) -> List[Issue]:
    '''
    Returns a list of issues with the product.
    
    Approach:
    Iterate through list of independent clauses in the review
    Use classifier to detect issue-relevant clauses
    Use classifier to determine issue class
    Iterate through issue-relevant clauses and merge those that relate to the same issue
    Create and return issues list
       
        Parameters:
            review_text_doc (Doc): spaCy document object
            
        Returns: 
            issues (List[Issue]): Product issues
    '''
    
    issues = []
       
    #1. Find clauses that describe issues
    issue_clauses = []
    for clause in doc_clauses:
        if _cl_issue_detect.prob_classify(clause.text).prob("is_issue") >= 0.9:
            prob_dist = _cl_issue_class.prob_classify(clause.text)
            
            if prob_dist.prob(prob_dist.max()) >= 0.9: #need to be sure to label
                issue_clauses.append((clause, prob_dist.max()))
            else:
                issue_clauses.append((clause, "UNKNOWN_ISSUE")) # TODO: Issue auto-classification
                
    #2. Iterate through clauses and create issues
    # TODO: Merge clauses with the same class (and associated time expression if applicable) into one issue
    for issue_clause in issue_clauses:
        cur_rel_timestamp = None
        
        #Get issue timestamp from contained keyframe time expression if applicable
        for keyframe in keyframes:
            if keyframe.time_start >= issue_clause[0].start and keyframe.time_end <= issue_clause[0].end:
                cur_rel_timestamp = keyframe.rel_timestamp
                break
        
        #Create issue object from text, class, hardcoded criticality and extracted timestamp.
        # TODO: Other fields (frequency for periodic time expressions, relevant image, issue resolution info)
        issues.append(Issue(text = issue_clause[0].text,
                            classification = issue_clause[1],
                            criticality = criticalities[issue_clause[1]] if issue_clause[1] in criticalities else 0.5,
                            rel_timestamp = cur_rel_timestamp,
                            frequency = None,
                            image = None,
                            resolution = None))
    
    return issues

def _extract_relevant_phrase(time_expr: Span) -> str:    
    '''
    Returns clause relevant to a time expression span, excluding the span itself and leading/trailing punctuation and conjunctions.
    
    Approach:
    Finds the governing verb of the clause containing the span
    Aggregates tokens from governing verb clause, excluding those of sub-clauses and those of the span itself
    Removes leading and trailing punctuations and conjunctions
    Builds a string from the aggregated tokens and returns it
    If the sentence is non-verbal, returns the sentence itself.
       
        Parameters:
            time_expr (Span): spaCy span object corresponding to matched time expression
            
        Returns: 
            phrase (str): Trimmed relevant phrase
    '''
    
    governing_verb = _get_governing_verb(time_expr.root)
    
    if governing_verb is not None:
        rel_phrase = []
        
        #in the relevant phrase...
        for t in governing_verb.subtree:
            in_current_clause = True
            
            if t.pos_ == 'VERB': #the governing verb, as well as any composite verbs relating to it
                in_current_clause = (t == governing_verb or (t.head == governing_verb and t.dep == xcomp))
            else: #tokens governed by the same verb (eg. in the clause)
                in_current_clause = (_get_governing_verb(t) == governing_verb)
                                
            if in_current_clause and (t.i < time_expr.start or t.i >= time_expr.end): #excluding the time expression itself
                rel_phrase.append(t)
        
        #exclude leading punctuation and conjunctions
        while rel_phrase[0].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
            rel_phrase.pop(0)
            
        #exclude trailing punctuation and conjunctions
        while rel_phrase[-1].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
            rel_phrase.pop()
        
        return ''.join(t.text + t.whitespace_ for t in rel_phrase).strip()
    
    else:
        return time_expr.sent.text
        
# TODO: Refactor (duplicate logic with above method)
def _extract_clauses(doc: Doc) -> List[Span]:
    '''
    Returns list of all independent clauses in a given document.
    
    Approach (bruteforce, to be refined):
    For every verb in the document, determines span boundaries of clause, excluding sub-clauses
    Filters clauses from the list if they are contained in another clause.
       
        Parameters:
            doc (Doc): spaCy document object
            
        Returns: 
            filtered_clauses (str): List of independent clauses
    '''
    clauses = []
    
    # TODO: Support nonverbal clauses
    #Iterates document verbs
    for verb in doc:
        if verb.pos_ == 'VERB':
            start = None 
            end = None
            
            #Determines clause boundaries from subtree tokens
            for t in verb.subtree:
                in_current_clause = True
                
                if t.pos_ == 'VERB': #the governing verb, as well as any composite verbs relating to it
                    in_current_clause = (t == verb or (t.head == verb and t.dep == xcomp))
                else: #tokens governed by the same verb (eg. in the clause)
                    in_current_clause = (_get_governing_verb(t) == verb)
                    
                #exclude leading/trailing punctuation and conjunctions
                if in_current_clause and t.pos_ not in ['CCONJ', 'PUNCT', 'ADP']: 
                    if start is None:
                        start = t.i
                        
                    end = t.i + 1
            
            if start is not None and end is not None:
                clauses.append(doc[start:end])
                            
    #Filters clauses contained in other clauses
    print(f"clauses {clauses}")
    filtered_clauses = [
        span1 for span1 in clauses
        if not any(
            span1.start >= span2.start and span1.end <= span2.end and span1 != span2 for span2 in clauses
        )
    ]
    
    return filtered_clauses
        
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
        if t.head.pos_ == 'VERB' and t.head.dep != xcomp: #accounts for composite verbs (e.g. "stopped working")
            governing_verb = t.head
            break
        t = t.head
        
    return governing_verb
    
def _print_reports(reports: List[Report]) -> None:
    '''
    Fancy printing method for list of Report dataclasses. 
       
        Parameters:
            reports (List[Report]): list of reports to print
    '''
    for report in reports:
        print(f"REPORT FOR REVIEW #{report.review_id} (weight: {report.report_weight})")
        print("Keyframes:")
        
        for keyframe in report.reliability_keyframes:
            print(f"• Keyframe: {keyframe.text} (rel. timestamp: {keyframe.rel_timestamp}, sentiment: {keyframe.sentiment})")
            
        if len(report.issues) > 0:
            print("Issues:")
            
            for issue in report.issues:
                print(f"• Issue: {issue.text} (classification: {issue.classification}, criticality: {issue.criticality}, rel. timestamp: " + 
                    f"{issue.rel_timestamp})")
                    
        print()
   
def process_reviews(reviews: List[Review]) -> List[Report]:
    '''
    Public method to process reviews and generate actionable reports. 
    Calls upon private methods to extract clauses, keyframes and issues from the review text.
    
        Parameters:
            reviews (List[Review]): list of reviews to process
            
        Returns: 
            reports (List[Report]): list of generated reports
    '''
    result = []

    for review in reviews:
        doc = _nlp(review.text)
        clauses = _extract_clauses(doc)

        keyframes = _extract_keyframes(doc, clauses, review.date)
        issues = _extract_issues(doc, clauses, keyframes)
        
        result.append(Report(
            review_id = review.review_id, 
            report_weight = 1, # TODO: Report weighing
            reliability_keyframes = keyframes, 
            issues = issues))

    _print_reports(result)
    
    return result