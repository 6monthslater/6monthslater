from typing import Any
import pika
import json
from analyzer.analyzer import Report, process_reviews
from parsing.amazon import Review
from requester.amazon import AmazonRegion
from utils import class_to_json

def __on_parse_message(channel: pika.adapters.blocking_connection.BlockingChannel,
        method_frame: pika.spec.Basic.Deliver, header_frame: pika.BasicProperties, body: bytes) -> None:
    """
    Callback for when a message is received on the parse queue.
    Will get all reviews for the given product id and publish them to the parsed_reviews queue.
    """
    if not method_frame.delivery_tag:
        return

    try:
        reviews = json.loads(body)
        print(reviews)
        print(f"Received {len(reviews)} items for analyzing")

        reports = __analyze_reviews(reviews)
        reports_json = class_to_json(reports)
        
        print(f"Finished analyzing {len(reviews)} items")

        channel.basic_publish(
            exchange='',
            routing_key='reports',
            body=reports_json,
            properties=pika.BasicProperties(
                content_type='application/json',
                delivery_mode=2, # persistent
            )
        )

        channel.basic_ack(delivery_tag=method_frame.delivery_tag)
    except Exception as e:
        print(e)
        return
    
def start_analyzing_listener(host: str, port: int) -> None:
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port))
    channel = connection.channel()
    channel.queue_declare(queue='to_analyze', durable=True)
    channel.queue_declare(queue='reports', durable=True)

    # Otherwise consumers fetch all messages, starving other consumers
    channel.basic_qos(prefetch_count=10)

    channel.basic_consume('to_analyze', __on_parse_message)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

def __analyze_reviews(reviews: list[dict[str, Any]]) -> list[Report]:
    """
    Runs all processed reviews through the scraper
    """
    return process_reviews([Review(
        author_id=review["author_id"],
        author_name=review["author_name"],
        author_image_url=review["author_image_url"],
        title=review["title"],
        text=review["text"],
        date=review["date"],
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
        product_name=review["product_name"],
        manufacturer_name=review["manufacturer_name"],
        manufacturer_id=review["manufacturer_id"]
    ) for review in reviews])