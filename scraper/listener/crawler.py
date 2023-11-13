import pika
from pika.exchange_type import ExchangeType
import json
from crawler.amazon import crawl_for_reviews
from utils.env import get_env_int

max_pages = 1000
current_crawl = None

def __on_crawl_message(channel: pika.adapters.blocking_connection.BlockingChannel,
        method_frame: pika.spec.Basic.Deliver, header_frame: pika.BasicProperties, body: bytes) -> None:
    """
    Callback for when a message is received on the to_crawl exchange.
    """
    global current_crawl
    if not method_frame.delivery_tag:
        return

    try:
        crawl_info = json.loads(body)
        if crawl_info['command'] == 'cancel':
            current_crawl = None
            print(f"Received cancel for {crawl_info['url']}")
            return

        print(f"Received {crawl_info['url']} for crawling")
        current_crawl = crawl_info['url']
        
        product_ids_so_far: set[str] = set()
        for i in range(max_pages):
            product_ids_so_far = crawl_for_reviews(crawl_info['url'], i, crawl_info['review_info'], product_ids_so_far, lambda x: channel.basic_publish(
                exchange='',
                routing_key='parse',
                body=x,
                properties=pika.BasicProperties(
                    content_type='application/json',
                    delivery_mode=2, # persistent
                )
            ))

            if current_crawl != crawl_info['url']:
                print(f"Stopping crawling early {crawl_info['url']}")
                break
        
        print(f"Finished crawling {crawl_info['url']}")
        current_crawl = None
    except Exception as e:
        print(e)
        return
    
def start_crawling_listener(host: str, port: int) -> None:
    """
    Start listening for messages on the to_crawl exchange.
    Will stop the previous crawl if asked to crawl another url.
    Will stop crawling if a stop command is recieved.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port))
    channel = connection.channel()
    channel.exchange_declare(exchange='to_crawl', exchange_type=ExchangeType.fanout)
    channel.queue_declare(queue='parse', durable=True)

    to_crawl = channel.queue_declare(queue='', exclusive=True)
    queue_name = to_crawl.method.queue
    channel.queue_bind(exchange='to_crawl', queue=str(queue_name))

    # Otherwise consumers fetch all messages, starving other consumers
    channel.basic_qos(prefetch_count=get_env_int("QUEUE_PREFETCH_COUNT"))

    channel.basic_consume(str(queue_name), __on_crawl_message, auto_ack=True)
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()