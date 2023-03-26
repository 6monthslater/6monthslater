import amqp from "amqplib";

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

  channel.consume("parsed_reviews", (msg) => {
    if (msg !== null) {
      console.log(msg.content.toString());
      channel.ack(msg);
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