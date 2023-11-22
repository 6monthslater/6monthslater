// noinspection JSUnresolvedReference,TypeScriptValidateJSTypes

import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const id = process.env.ADMIN_UUID;
  if (!id) {
    throw new Error("ADMIN_UUID must be defined in .env");
  }
  console.log("Creating...");
  const admin = await prisma.user.upsert({
    where: {
      id: id,
    },
    update: {
      roles: ["Admin"],
    },
    create: {
      id: id,
      roles: ["Admin"],
    },
  });
  console.log(
    `Successfully created user with id ${id} and role(s): ${admin.roles.toString()}.`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })

  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
