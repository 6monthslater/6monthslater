import amqp from "amqplib";
import { db } from "../utils/db.server";

export enum ReviewSource {
  AMAZON = "amazon"
}

export enum ReviewRegion {
  COM = "com",
  CA = "ca"
}

export interface Product {
  id: string;
  type: ReviewSource;
  region: ReviewRegion;
}

let connection: amqp.Connection | undefined;
// Used because of hot reload
declare global {
  var __queue: amqp.Connection | undefined; //eslint-disable-line
}

async function setupConnection(): Promise<void> {
  if (!global.__queue) {
    const port = process.env.QUEUE_PORT || 5672;
    global.__queue = await amqp.connect(`amqp://${process.env.QUEUE_HOST}:${port}`);
  }

  connection = global.__queue;
}

export async function startListeningForReviews() {
  if (!connection) {
    throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  await channel.assertQueue("parse", {
    durable: true
  });
  await channel.assertQueue("parsed_reviews", {
    durable: true
  });

  channel.consume("parsed_reviews", async (msg) => {
    if (msg !== null) {
      try {
        const reviews = JSON.parse(msg.content.toString());

        for (const review of reviews) {
          await db.review.create({
            data: {
              author_id: review.author_id,
              author_name: review.author_name,
              author_image_url: review.author_image_url,
              title: review.title,
              text: review.text,
              date: new Date(review.date * 1000),
              date_text: review.date_text,
              review_id: review.review_id,
              attributes: review.attributes,
              verified_purchase: review.verified_purchase,
              found_helpful_count: review.found_helpful_count,
              is_top_positive_review: review.is_top_positive_review,
              is_top_critical_review: review.is_top_critical_review,
              images: {
                create: review.images.map((image) => ({
                  image_url: image,
                }))
              },
              country_reviewed_in: review.country_reviewed_in,
              region: review.region,
            }
          });
        }

        channel.ack(msg);
      } catch (e) {
        console.error(`Failed to parse parsed review from queue: ${e}`);
      }
    }
  });
}

// Used because of hot reload
setupConnection().then(() => {
  startListeningForReviews();
});

export async function sendProductToQueue(product: Product) {
  if (!connection) {
    throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  await channel.assertQueue("parse", {
    durable: true
  });

  channel.sendToQueue("parse", Buffer.from(JSON.stringify(product)));
}