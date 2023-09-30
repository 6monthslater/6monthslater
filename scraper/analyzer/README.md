

# Analyzer
The analyzer module is responsible with parsing scraped reviews for time-sensitive and issue-relevant product data to generate actionable reports. It receives reviews from the scraper and its reports are submitted to our database. 

## Overview
### Main Libraries
* **`spaCy`**: Major NLP library used to process reviews.
* **`SUTime`**: Python wrapper for Stanford University's all-purpose temporal tagger (originally written in Java). Used to parse time expressions in reviews and generate keyframes.
* **`TextBlob`**:  NLP library used to train and run text classifiers.
* **`vaderSentiment`**: NLP library used to estimate user sentiment for extracted product ownership keyframes.

### Module Files
**`analyzer/`**
**`├── jars`**: Contains dependencies used by the SUTime library.
**`├── pom.xml`**: Maven configuration file used to download SUTime dependencies.
**`├── __init__.py`**: Python package initializer.
**`├── issues.py`**: Hardcoded list of common issues with criticality ratings
**`├── analyzer.py`**: Main script of the analyzer module. See below for methods.
**`├── train_relevance.json`**: Data used to train the classifier in charge of determining the relevance of temporal keyframes in a review.
**`├── train_issue_detection.json`**: Data used to train the classifier in charge of detecting product issues in a review.
**`├── train_issue_class.json`**: Data used to train the classifier in charge of classifying product issues in a review.
*Note that JSON files do not support comments.*

### Related Files
* **`6monthslater/scraper/analyzer.py`**: Starts the listener for the analyzer module.
* **`6monthslater/scraper/tests/analyzer`**: Automated tests for this module.

### `analyzer.py` Methods
Further documented in the docstrings of `analyzer.py`.
* **`_extract_keyframes`**
* **`_extract_issues`**
* **`_extract_relevant_phrase`**
* **`_extract_clauses`**
* **`_get_governing_verb`**
* **`_process_review`**: Private worker method.
* **`process_reviews`**: Public main method.

## Running & Testing

There are various ways to run the analyzer directly, but we recommend running the test script instead. The virtual environment must be activated (`source venv/bin/activate` on Unix, `.\venv\Scripts\activate` on Windows).

* **Running `scraper/analyzer.py`**: If you execute `scraper/analyzer.py` directly, the analyzing listener will start running. If the rest of the scraper isn't also running, this will do nothing and/or crash. You cannot run `scraper/analyzer/analyzer.py` due to how Python handles modules.
* **Running `analyzer.py` in a Python shell**: This is not recommended because generating lists of valid review objects in the shell is very cumbersome.
```py
python
>>> from analyzer.analyzer import process_reviews
>>> reviews = [ ... ]
>>> reports = process_reviews(reviews)
```
* **Running the testing script via `pytest`**: With `scraper` as your working directory, run either `pytest` (to run all project tests) or `pytest tests/analyzer/test_analyzer.py` (to run only the analyzer's). Include the `-rP` option in your command to see the standard output for passed tests (instead of just failed ones). You can create your own tests by adding parameter tuples in the `@parameterized.expand` lists (see provided test cases for examples).
  * The parametrized `test_extract_keyframes()` test method takes in a test name, a review (missing Review fields can be set to defaults via `produce_sample_review()`) and a list of ints specifying the time (in days) of every relevant keyframe in relation to the earliest one in the review. The test passes if the list of keyframes extracted by the Analyzer module matches the size and time values of the passed list.
  * Other tests WIP.
