from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import spacy
from spacy.tokens import Doc, Token, Span
from spacy.matcher import Matcher
from spacy.symbols import xcomp
import re
from spacytextblob.spacytextblob import SpacyTextBlob
from textblob.classifiers import NaiveBayesClassifier 
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from parsing.amazon import Review
from datetime import datetime
import dateparser
from sutime import SUTime
import os

#todo remove
import json
from analyzer.cache import *
_DEBUG = True

nlp = spacy.load("en_core_web_lg")
#nlp = spacy.load("en_core_web_sm")

nlp.add_pipe('spacytextblob')

with open('analyzer/train_relevance.json', 'r') as fp:
    cl_relevance = NaiveBayesClassifier(fp, format="json")
    
with open('analyzer/train_issue_detection.json', 'r') as fp:
    cl_issue_detect = NaiveBayesClassifier(fp, format="json")
    
with open('analyzer/train_issue_class.json', 'r') as fp:
    cl_issue_classify = NaiveBayesClassifier(fp, format="json")

sent_analyzer = SentimentIntensityAnalyzer()

#sutime = SUTime(mark_time_ranges=True, include_range=True, jars=os.path.join(os.path.dirname(__file__), 'jars'))

criticalities = {"issue1": 1.0, "issue2": 0.0}

@dataclass
class Keyframe:
    rel_timestamp: int
    text: str
    time_expr: Span
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
    review_id: int
    report_weight: float
    reliability_keyframes: List[Keyframe]
    issues: List[Issue]
    

def extract_keyframes(debug_cache: List[Dict], review_text_doc: Doc, doc_clauses: List[Span], review_date: datetime) -> List[Keyframe]:
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
    
    #print("KEYFRAMES: " + review_text_doc.text)
    keyframes = []
       
    #1. Extract relative and exact date expressions (relative to review post date)
    time_expressions = []
        
    #parse_results = sutime.parse(review_text_doc.text, str(review_date))
    #print("cache = " + json.dumps(parse_results))
    #print()
    
    parse_results = debug_cache    # todo remove cache stuff before pushing
   
    for result in parse_results:
        if result['type'] in ['DATE', 'TIME']:
            relative_date = review_date if result['value'] == 'PRESENT_REF' else dateparser.parse(result['value'])
            time_expression_span = review_text_doc.char_span(result['start'], result['end'])
            relevant_phrase = extract_relevant_phrase(time_expression_span)
            
            #Filter them based on relevance to product ownership (90% should be a very reasonable threshold with few false negatives)
            relevance_to_ownership_exp = cl_relevance.prob_classify(relevant_phrase).prob("relevant")
            
            if relevance_to_ownership_exp >= 0.9: 
                time_expressions.append((relative_date, relevant_phrase, time_expression_span))
            else:
                print("DEBUG: Filtered expression '" + relevant_phrase + "' based on relevance to ownership experience (prob = " + "{:.2f}".format(relevance_to_ownership_exp) + ")")
            
    #2. Find the earliest time expression and set that as our reference point (date of sale)
    ref_date = review_date
    for time_expression in time_expressions:
        if(time_expression[0] <= ref_date):
            ref_date = time_expression[0]
                
    #3. Create keyframes
    for time_expression in time_expressions:
        keyframes.append(Keyframe(rel_timestamp = (time_expression[0] - ref_date).days, 
                                  text = time_expression[1],
                                  time_expr = time_expression[2],
                                  sentiment = (sent_analyzer.polarity_scores(time_expression[1])['compound']+1)/2, 
                                  interp = None))
        #print(keyframes[-1])
    
    #TODO: Add sentiment from potentially related but independent clauses!!!!!!!!!
    
    #4. Return sorted by time
    return sorted(keyframes, key = lambda k: k.rel_timestamp)


def extract_issues(review_text_doc: Doc, doc_clauses: List[Span], keyframes: List[Keyframe]) -> List[Issue]:
    '''
    Returns a list of issues with the product.
    
    Approach:
    todo
       
        Parameters:
            review_text_doc (Doc): spaCy document object
            
        Returns: 
            issues (List[Issue]): Product issues
    '''
    
    print("ISSUES: " + review_text_doc.text)
    issues = []
       
    #1. Find clauses that describe issues
    issue_clauses = []
    for clause in doc_clauses:
        if cl_issue_detect.prob_classify(clause.text).prob("is_issue") >= 0.9:
            prob_dist = cl_issue_classify.prob_classify(clause.text)
            
            if prob_dist.prob(prob_dist.max()) >= 0.9: #need to be sure to label
                issue_clauses.append((clause, prob_dist.max()))
            else:
                issue_clauses.append((clause, "UNKNOWN_ISSUE")) #TODO auto-classification
                
    #2. Iterate and merge clauses with the same class (and associated time expression if applicable)
    for issue_clause in issue_clauses:
        #acc_text += ";" + issue_clause[0]
    
        #if True:
        #    pass
        #    
        #else: 
        #    issues.append(Issue(text = acc_text,
        #                        classification = cur_class,
        #                        criticality = criticalities[cur_class] if cur_class in criticalities else 0.5f,
        #                        rel_timestamp = cur_rel_timestamp,
        #                        frequency = None,
        #                        image = None,
        #                        resolution = None))
        
        cur_rel_timestamp = None
        
        for keyframe in keyframes:
            if keyframe.time_expr.start >= issue_clause[0].start and keyframe.time_expr.end <= issue_clause[0].end:
                cur_rel_timestamp = keyframe.rel_timestamp
                break
        
        issues.append(Issue(text = issue_clause[0].text,
                            classification = issue_clause[1],
                            criticality = criticalities[issue_clause[1]] if issue_clause[1] in criticalities else 0.5,
                            rel_timestamp = cur_rel_timestamp,
                            frequency = None,
                            image = None,
                            resolution = None))
                            
        print(issues[-1])
    
    return issues

def extract_relevant_phrase(ent: Span) -> str:    
    governing_verb = get_governing_verb(ent.root)
    
    if governing_verb is not None:
        rel_phrase = []
        
        #in the relevant phrase
        for t in governing_verb.subtree:
            in_current_clause = True
            
            if t.pos_ == 'VERB': #the governing verb, as well as any composite verbs relating to it
                in_current_clause = (t == governing_verb or (t.head == governing_verb and t.dep == xcomp))
            else: #tokens governed by the same verb (eg. in the clause)
                in_current_clause = (get_governing_verb(t) == governing_verb)
                                
            if in_current_clause and (t.i < ent.start or t.i >= ent.end): #excluding the time expression itself
                rel_phrase.append(t)
        
        #exclude leading punctuation and conjunctions
        while rel_phrase[0].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
            rel_phrase.pop(0)
            
        #exclude trailing punctuation and conjunctions
        while rel_phrase[-1].pos_ in ['CCONJ', 'PUNCT', 'ADP']:
            rel_phrase.pop()
        
        return ''.join(t.text + t.whitespace_ for t in rel_phrase).strip()
    
    else:
        return ent.sent.text
        
def extract_clauses(doc: Doc) -> List[Span]:
    clauses = []
    
    #bruteforce approach, similar to above method; todo refactor; todo nonverbal clauses
    for verb in doc:
        if verb.pos_ == 'VERB':
            start = None
            end = None
            
            for t in verb.subtree:
                in_current_clause = True
                
                if t.pos_ == 'VERB': 
                    in_current_clause = (t == verb or (t.head == verb and t.dep == xcomp))
                else: 
                    in_current_clause = (get_governing_verb(t) == verb)
                    
                if in_current_clause and t.pos_ not in ['CCONJ', 'PUNCT', 'ADP']:
                    if start == None:
                        start = t.i
                        
                    end = t.i + 1
            
            if start != None and end != None:
                clauses.append(doc[start:end])
                            
    #remove clauses contained in other clauses
    filtered_clauses = [
        span1 for span1 in clauses
        if not any(
            span1.start >= span2.start and span1.end <= span2.end and span1 != span2 for span2 in clauses
        )
    ]
    
    #for clause in filtered_clauses:
    #    print("Clause: " + clause.text)
    
    return filtered_clauses
        
def get_governing_verb(t: Token) -> Token:
    governing_verb = None
    
    while t.head != t:
        if t.head.pos_ == 'VERB' and t.head.dep != xcomp: #accounts for composite verbs (e.g. "stopped working")
            governing_verb = t.head
            break
        t = t.head
        
    return governing_verb
    
    
    
#def process_reviews(reviews: List[Review]) -> List[Report]:
def process_reviews(reviews: List[Dict]) -> List[Report]:
    result = []

    for review in reviews:
        doc = nlp(review['text'])
        clauses = extract_clauses(doc)
        keyframes = extract_keyframes(review['cache'], doc, clauses, review['date'])
        issues = extract_issues(doc, clauses, keyframes)
        
        result.append(Report(
            review_id = review['review_id'], 
            report_weight = 1, 
            reliability_keyframes = keyframes, 
            issues = issues))

    return result

process_reviews([
    {"review_id": 1,  "cache": cache1, "text": "I bought this product a week ago and it broke yesterday. I was really disappointed. I love this sandwich.",  "date": datetime(2023, 3, 10)},
    {"review_id": 2,  "cache": cache2, "text": "My family went camping last week; I bought this product a week ago and it broke yesterday. I was really disappointed.",  "date": datetime(2023, 3, 10)},
    {"review_id": 3,  "cache": cache3, "text": "I got this last month, and it's been working great ever since.",  "date": datetime(2023, 2, 20)},
    {"review_id": 4,  "cache": cache4, "text": "I've had this item for 6 months now, and it's still going strong.",  "date": datetime(2023, 3, 15)},
    {"review_id": 5,  "cache": cache5, "text": "Bought it two years ago, and it's never given me any problems. Highly recommend!",  "date": datetime(2023, 3, 17)},
    {"review_id": 6,  "cache": cache6, "text": "It arrived on March 1st and stopped working on March 10th. Terrible quality!",  "date": datetime(2023, 3, 17)},
    {"review_id": 7,  "cache": cache7, "text": "Purchased this item in January 2022, and it's been fantastic so far.",  "date": datetime(2023, 1, 25)},
    {"review_id": 8,  "cache": cache8, "text": "I got it as a gift on Christmas 2022, and I've been using it daily since.",  "date": datetime(2023, 3, 10)},
    {"review_id": 9,  "cache": cache9, "text": "Thus 3 months ago I bought it.",  "date": datetime(2023, 3, 10)},
    {"review_id": 10, "cache": cache10, "text": "It arrived on March 1st, 2020 and stopped working on APRIL 5. Terrible quality!",  "date": datetime(2023, 3, 17)},
    {"review_id": 11, "cache": cache11, "text": "It arrived on Mar 1st and stopped working on Apr 5. Terrible quality!",  "date": datetime(2023, 3, 17)},
    {"review_id": 12, "cache": cache12, "text": "It arrived in mid-August and stopped working in late December. Terrible quality!",  "date": datetime(2023, 3, 17)},
])