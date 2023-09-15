import { PrismaClient } from "@prisma/client";

// Used because of hot reload to not create multiple connections each time
declare global {
  var __db: PrismaClient; //eslint-disable-line
}

if (!global.__db) {
  global.__db = new PrismaClient();
  global.__db.$connect();
}
export const db = global.__db;
