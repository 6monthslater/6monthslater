import amqp from "amqplib";
import { db } from "../utils/db.server";

export enum ReviewSource {
  AMAZON = "amazon",
}

export enum ReviewRegion {
  COM = "com",
  CA = "ca",
}

export interface Product {
  id: string;
  type: ReviewSource;
  region: ReviewRegion;
}

let connection: amqp.Connection | undefined;
// Used because of hot reload to not create multiple connections each time
declare global {
  var __queue: amqp.Connection | undefined; //eslint-disable-line
}

/**
 * Sets up the connection to the queue, and reuses the connection from the global object if it exists
 */
async function setupConnection(): Promise<boolean> {
  let result = false;
  if (!global.__queue) {
    const port = process.env.QUEUE_PORT || 5672;

    console.log(`Connecting to queue at ${port}`);

    global.__queue = await amqp.connect(
      `amqp://${process.env.QUEUE_HOST}:${port}`
    );

    result = true;
  }

  connection = global.__queue;
  return result;
}

/**
 * When a review is parsed, it is sent to the queue to be stored in the database
 */
export async function startListeningForReviews() {
  if (!connection) {
    throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  await channel.assertQueue("parse", {
    durable: true,
  });
  await channel.assertQueue("parsed_reviews", {
    durable: true,
  });
  await channel.assertQueue("reports", {
    durable: true,
  });

  await channel.consume("parsed_reviews", async (msg) => {
    if (msg !== null) {
      try {
        const reviews = JSON.parse(msg.content.toString());

        for (const review of reviews) {
          const manufacturerId = await db.manufacturerStoreId.findUnique({
            where: {
              store_id: review.manufacturer_id,
            },
            select: {
              manufacturer_id: true,
            },
          });

          const manufacurerCreateObject = manufacturerId?.manufacturer_id
            ? {
                connectOrCreate: {
                  create: {
                    name: review.manufacturer_name,
                    store_ids: {
                      connectOrCreate: {
                        create: {
                          store_id: review.manufacturer_id,
                        },
                        where: {
                          store_id: review.manufacturer_id,
                        },
                      },
                    },
                  },
                  where: {
                    id: manufacturerId?.manufacturer_id,
                  },
                },
              }
            : {
                create: {
                  name: review.manufacturer_name,
                  store_ids: {
                    connectOrCreate: {
                      create: {
                        store_id: review.manufacturer_id,
                      },
                      where: {
                        store_id: review.manufacturer_id,
                      },
                    },
                  },
                },
              };

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
                })),
              },
              country_reviewed_in: review.country_reviewed_in,
              region: review.region,
              product: {
                connectOrCreate: {
                  create: {
                    name: review.product_name,
                    manufacturer: manufacurerCreateObject,
                  },
                  where: {
                    name: review.product_name,
                  },
                },
              },
            },
          });
        }

        channel.ack(msg);
      } catch (e) {
        console.error(`Failed to parse parsed review from queue: ${e}`);
      }
    }
  });

  await channel.consume("reports", async (msg) => {
    if (msg !== null) {
      try {
        const reports = JSON.parse(msg.content.toString());

        for (const report of reports) {
          const id = (await db.review.findFirst({
            where: {
              review_id: report.review_id
            },
            select: {
              id: true
            }
          }))?.id;

          if (!id) {
            throw new Error(`Failed to find review with id ${report.review_id}`);
          }

          await db.report.create({
            data: {
              report_weight: report.report_weight,
              issues: {
                create: report.issues.map((issue) => ({
                  text: issue.text,
                  criticality: issue.criticality,
                  rel_timestamp: issue.rel_timestamp,
                  frequency: issue.frequency,
                  images: {
                    create: issue.images ? issue.images.map((image) => ({
                      image_url: image,
                    })) : undefined,
                  },
                })),
              },
              reliability_keyframes: {
                create: report.reliability_keyframes.map((keyframe) => ({
                  rel_timestamp: keyframe.rel_timestamp,
                  sentiment: keyframe.sentiment,
                  interp: keyframe.interp,
                })),
              },
              review: {
                connect: {
                  id,
                },
              },
            },
          });
        }

        channel.ack(msg);
      } catch (e) {
        console.error(`Failed to parse reports from queue: ${e}`);
      }
    }
  });
}

// Used because of hot reload
const connectionPromise = setupConnection();
connectionPromise.then((newInstance) => {
  if (newInstance) startListeningForReviews();
});

export type CrawlerCommand =
  | {
      command: "set";
      url: string;
      review_info: {
        type: ReviewSource;
        region: ReviewRegion;
      };
    }
  | {
      command: "cancel";
    };

export async function sendCrawlerCommand(command: CrawlerCommand) {
  if (!connection) {
    await connectionPromise;
    if (!connection) throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  await channel.assertExchange("to_crawl", "fanout", {
    durable: false,
  });

  channel.publish("to_crawl", "", Buffer.from(JSON.stringify(command)));
}

export interface QueueStatus {
  messageCount: number;
  consumerCount: number;
}

/**
 * Meta information about a specific queue in a serializable format for pages to use
 */
export async function getStatusOfQueue(queueId: string): Promise<QueueStatus> {
  if (!connection) {
    await connectionPromise;
    if (!connection) throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  const queueData = await channel.assertQueue(queueId);

  channel.close();
  return {
    messageCount: queueData.messageCount,
    consumerCount: queueData.consumerCount,
  };
}

export async function sendProductToQueue(product: Product) {
  if (!connection) {
    await connectionPromise;
    if (!connection) throw new Error("Queue connection not set up");
  }

  const channel = await connection.createChannel();
  await channel.assertQueue("parse", {
    durable: true,
  });

  channel.sendToQueue("parse", Buffer.from(JSON.stringify(product)));
}
