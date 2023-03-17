import json
import pika

host = "localhost"
port = 5673

def add_amazon_item() -> None:
    item = {
        "type": "amazon",
        "region": "com",
        "id": "B08B3K9K6P"
    }
    items_json = json.dumps(item, default=lambda o: o.__dict__)
    print(items_json)

    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port))
    channel = connection.channel()
    channel.queue_declare(queue='parse')

    channel.basic_publish(
        exchange='',
        routing_key='parse',
        body=items_json,
        properties=pika.BasicProperties(
            content_type='application/json',
            delivery_mode=2, # persistent
        )
    )

    channel.basic_consume('parsed_reviews', lambda channel, method_frame, header_frame, body: print(body))
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

add_amazon_item()