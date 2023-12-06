# Web Server

The web server is built using the [Remix](https://remix.run) framework in TypeScript.
This part of the application handles the front-end UI,
authentication, and communicating with Rabbit-MQ to tell the scraper what to do.
It also listens to events from the Scraper for when scraping is finished and saves this
information into the database.

For information on starting and managing the web server, see the [Main Documentation](../README.md).

## Folders

- `.husky` contains the pre-commit hook definitions and has its [own documentation](./.husky/README.md).
- `app` contains the Remix app itself and has its [own documentation](./app/README.md).
- `build` contains the output of the Node.JS build process.
- `node_modules` contains the code of any package dependencies of our app, defined in [`package.json`](./package.json).
- `prisma` contains the schema definition of our PostgrSQL database, the SQL migrations, and the [databse seeding code](./prisma/seed.ts).
- `public` contains static files that are served alongside the Remix app.

## Dependencies

Dependencies are handled by the Node.js package managed, and are defined in [`package.json`](./package.json).

## Linting

Linting of the web server is done by a combination of the TypeScript compiler and ESLint.

- ESLint is configured in [`.eslintrc.js`](./.eslintrc.js).
- The TypeScript compiler is configred in [`tsconfig.json`](./tsconfig.json).

## Formatting

[Prettier](https://prettier.io/) enforces formatting of all code in this folder through a [pre-commit hook](./.husky/README.md).

We have Prettier configuration files in our project, but we are using the default settings.

We suggest developers use the Prettier plugins for their preferred IDE to avoid having to repeatedly run
the Prettier command.

## Scripts

Scripts for the web server are defined in [`package.json`](./package.json).
