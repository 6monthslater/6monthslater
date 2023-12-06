# Web Server

The web server is built using the [Remix](https://remix.run) framework in TypeScript.
This part of the application handles the front-end UI,
authentication, and communicating with Rabbit-MQ to tell the scraper what to do.
It also listens to events from the Scraper for when scraping is finished and saves this
information into the database.

For information on starting and managing the web server, see the [Main Documentation](../README.md).
