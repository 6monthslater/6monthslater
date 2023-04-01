import { PrismaClient } from "@prisma/client";

declare global {
  var __db: PrismaClient; //eslint-disable-line
}

if (!global.__db) {
  global.__db = new PrismaClient();
  global.__db.$connect();
}
export const db = global.__db;
