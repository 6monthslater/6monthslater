import functools
import dateutil.parser as dp
from datetime import timedelta
import traceback
from typing import Any
import pika
import json
from analyzer.analyzer import Issue, Report, process_reviews
from parsing.amazon import Review
from requester.amazon import AmazonRegion
from utils import class_to_json
from utils.env import get_env_bool
from llama_cpp import Llama
from llama_cpp.llama_grammar import LlamaGrammar
import threading
import os

initial_prompt = """
List each functional issue with the following product described in the review below. If a repair was needed, that is a problem. Ignore comparisons to\
competitors or previous versions. Respond in JSON with an array of issues with the time_since_event (in words, or "unknown"), time_since_event_in_days \
(-1 if unknown), text (full sentences that are an exact quote), issue_short_name (one or two word summary) and is_product_failure.
Example: [{"text": "Belt broke last month so I ordered new ones.", "issue_short_name": "Broken belt"}]
---
"""

def __on_parse_message(channel: pika.adapters.blocking_connection.BlockingChannel,
        method_frame: pika.spec.Basic.Deliver, header_frame: pika.BasicProperties, body: bytes) -> None:
    """
    Callback for when a message is received on the parse queue.
    Will get all reviews for the given product id and publish them to the parsed_reviews queue.
    """
    if not method_frame.delivery_tag:
        return
    
    t = threading.Thread(target=do_work, args=(channel, method_frame, body))
    t.start()

def do_work(channel: pika.adapters.blocking_connection.BlockingChannel,
        method_frame: pika.spec.Basic.Deliver, body: bytes) -> None:
    if not method_frame.delivery_tag:
        return

    try:
        reviews = json.loads(body)
        print(reviews)
        print(f"Received {len(reviews)} items for analyzing")

        reports = __analyze_reviews(reviews)
        reports_json = class_to_json(reports)
        
        print(f"Finished analyzing {len(reviews)} items")

        # Based on https://github.com/pika/pika/blob/main/examples/basic_consumer_threaded.py
        cb = functools.partial(ack_channel, channel, method_frame.delivery_tag, reports_json)
        channel.connection.add_callback_threadsafe(cb)
        
    except Exception:
        traceback.print_exc()
        return
    
def ack_channel(channel: pika.adapters.blocking_connection.BlockingChannel,
        delivery_tag: int, reports_json: str) -> None:
    print(channel.is_open)

    channel.basic_publish(
        exchange='',
        routing_key='reports',
        body=reports_json,
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2, # persistent
        )
    )

    channel.basic_ack(delivery_tag=delivery_tag)
    
def start_analyzing_listener(host: str, port: int) -> None:
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port, heartbeat=10))
    channel = connection.channel()
    channel.queue_declare(queue='to_analyze', durable=True)
    channel.queue_declare(queue='reports', durable=True)

    # Otherwise consumers fetch all messages, starving other consumers
    # Set to 1 because it is running a threaded worker, and we only
    # want one message at a time
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume('to_analyze', __on_parse_message)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

def __analyze_reviews(reviews: list[dict[str, Any]]) -> list[Report]:
    if get_env_bool("TRAINING_MODE"):
        return __analyze_reviews_using_llm(reviews)
    else:
        return process_reviews([Review(
            author_id=review["author_id"],
            author_name=review["author_name"],
            author_image_url=review["author_image_url"],
            title=review["title"],
            text=review["text"],
            date=int(dp.parse(review["date"]).timestamp()),
            date_text=review["date_text"],
            review_id=review["review_id"],
            attributes=review["attributes"],
            verified_purchase=review["verified_purchase"],
            found_helpful_count=review["found_helpful_count"],
            is_top_positive_review=review["is_top_positive_review"],
            is_top_critical_review=review["is_top_critical_review"],
            images=review["images"],
            country_reviewed_in=review["country_reviewed_in"],
            region=AmazonRegion(review["region"]),
            product_name=review["product"]["name"],
            manufacturer_name=review["product"]["manufacturer"]["name"],
            manufacturer_id=review["product"]["manufacturer"]["id"]
        ) for review in reviews])

def __analyze_reviews_using_llm(reviews: list[dict[str, Any]]) -> list[Report]:
    """
    Runs all processed reviews through an LLM to get predicted issues.
    Used to train the main analyzer
    """

    llm = Llama(model_path="./models/codellama-7b-instruct.Q5_K_S.gguf", n_ctx=2048)
    grammar = LlamaGrammar.from_file("./grammar-3.gbnf")

    training_data = []
    reports = []

    for review in reviews:
        review_text = review["text"].replace('"', '\\"')

        prompt = initial_prompt + f"""
        Product: "{review["product"]["name"]}"
        Review: "{review_text}"
        Result:
        """

        result = llm(prompt, max_tokens=2048, stop=["]"], grammar=grammar)["choices"][0]["text"] # pyright: ignore
        print(result)
        result_parsed = json.loads(result + "]")
        
        for result in result_parsed:
            training_data.append({
                "text": result["text"],
                "label": "is_issue" if result["is_product_failure"] else "not_issue"
            })

        reports.append(Report(
            review_id = review["review_id"],
            report_weight = 1,
            reliability_keyframes = [],
            issues = [Issue(
                text=result["text"],
                rel_timestamp=int((dp.parse(review["date"]) + timedelta(days=abs(result["time_since_event_in_days"]))).timestamp()),
                classification=result["issue_short_name"],
                criticality=None,
                frequency=None,
                image=None,
                resolution=None
            ) for result in result_parsed if result["is_product_failure"]]))

    save_training_data(training_data)
        
    return reports

def save_training_data(reports: list[Any]) -> None:
    os.makedirs("results", exist_ok=True)
    file_name = "results/training_data.json"

    if os.path.exists(file_name):
        with open(file_name, "r") as f:
            old_reports = json.load(f)
            reports.extend(old_reports)
    with open(file_name, "w") as f:
        json.dump(reports, f, indent=4)