from enum import Enum
from typing import Any
import pika
import json
import parsing.amazon as amazon
from requester.amazon import AmazonRegion
from utils import class_to_json

class ReviewSource(Enum):
    AMAZON = "amazon"

def __on_parse_message(channel: pika.adapters.blocking_connection.BlockingChannel,
        method_frame: pika.spec.Basic.Deliver, header_frame: pika.BasicProperties, body: bytes) -> None:
    if not method_frame.delivery_tag:
        return

    try:
        parsed = json.loads(body)
        print(f"Received {parsed['id']} for parsing")

        reviews = __get_reviews(parsed)
        reviews_json = class_to_json(reviews)
        
        print(f"Finished parsing {parsed['id']}")

        channel.basic_publish(
            exchange='',
            routing_key='parsed_reviews',
            body=reviews_json,
            properties=pika.BasicProperties(
                content_type='application/json',
                delivery_mode=2, # persistent
            )
        )
    except Exception as e:
        print(e)
        return

    channel.basic_ack(delivery_tag=method_frame.delivery_tag)
    
def start_parsing_listener(host: str, port: int) -> None:
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port))
    channel = connection.channel()
    channel.queue_declare(queue='parse')
    channel.queue_declare(queue='parsed_reviews')

    channel.basic_consume('parse', __on_parse_message)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

def __get_reviews(parsed: dict[str, Any]) -> list[amazon.Review]:
    source = ReviewSource(parsed["type"])

    match source:
        case ReviewSource.AMAZON:
            region = AmazonRegion(parsed["region"])
            if region:
                return amazon.parse_reviews(region, parsed["id"])
            else:
                raise ValueError(f"Unknown region {parsed['region']}")
        case _:
            raise ValueError(f"Unknown review source {source}")